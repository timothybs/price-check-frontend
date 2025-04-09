import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export default function WeeklyOrdersWithMatches() {
  const [sales, setSales] = useState([])
  const [itemCount, setItemCount] = useState(0)
  const [expandedRows, setExpandedRows] = useState({})
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const toggleExpand = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    const fetchSales = async () => {
      if (startDate && endDate) {
        const { data, error } = await supabase
          .from('weekly_sales_with_matches')
          .select('*')
          .gte('order_date', startDate)
          .lte('order_date', endDate)
          .order('order_date', { ascending: false })
  
        if (error) {
          console.error('❌ Error fetching matched sales:', error.message)
        } else {
          console.log('✅ Sales data:', data)
          setSales(data)
          setItemCount(data.length)
        }
      }
    }
  
    fetchSales()
  }, [startDate, endDate])

  const homeTotal = useMemo(() => {
    return sales.reduce((total, sale) => total + (sale.home_hardware_actual_price || 0), 0)
  }, [sales])

  const homeBestTotal = useMemo(() => {
    return sales.reduce((total, sale) => {
      const h = parseFloat(sale.home_hardware_actual_price);
      const t = parseFloat(sale.toolbank_actual_price);
      const s = parseFloat(sale.stax_actual_price);
  
      const prices = [h, t, s].filter(p => !isNaN(p));
      const min = Math.min(...prices);
  
      if (!isNaN(h) && h === min) {
        return total + h;
      }
  
      return total;
    }, 0);
  }, [sales]);

  const toolbankTotal = useMemo(() => {
    return sales.reduce((total, sale) => total + (sale.toolbank_actual_price || 0), 0)
  }, [sales])

  const toolbankBestTotal = useMemo(() => {
    return sales.reduce((total, sale) => {
      const h = parseFloat(sale.home_hardware_actual_price);
      const t = parseFloat(sale.toolbank_actual_price);
      const s = parseFloat(sale.stax_actual_price);
  
      const prices = [h, t, s].filter(p => !isNaN(p));
      const min = Math.min(...prices);
  
      if (!isNaN(t) && t === min) {
        return total + t;
      }
  
      return total;
    }, 0);
  }, [sales]);

  const staxTotal = useMemo(() => {
    return sales.reduce((total, sale) => total + (sale.stax_actual_price || 0), 0)
  }, [sales])

  const staxBestTotal = useMemo(() => {
    return sales.reduce((total, sale) => {
      const h = parseFloat(sale.home_hardware_actual_price);
      const t = parseFloat(sale.toolbank_actual_price);
      const s = parseFloat(sale.stax_actual_price);
  
      const prices = [h, t, s].filter(p => !isNaN(p));
      const min = Math.min(...prices);
  
      if (!isNaN(s) && s === min) {
        return total + s;
      }
  
      return total;
    }, 0);
  }, [sales]);

  const getHighlightStyle = (homePrice, toolbankPrice, staxPrice, source) => {
    const h = parseFloat(homePrice)
    const t = parseFloat(toolbankPrice)
    const s = parseFloat(staxPrice)

    if ([h, t, s].every(Number.isNaN)) return {}

    const min = Math.min(...[h, t, s].filter(p => !isNaN(p)))

    if (source === 'home' && h === min) return { backgroundColor: '#d4edda' }
    if (source === 'toolbank' && t === min) return { backgroundColor: '#d4edda' }
    if (source === 'stax' && s === min) return { backgroundColor: '#d4edda' }

    return {}
  }

  const generateCSVBlob = (filteredSales) => {
    const aggregatedSales = filteredSales.reduce((acc, sale) => {
      const barcode = sale.barcode.padStart(13, '0');
      if (!acc[barcode]) {
        acc[barcode] = { barcode, quantity: 0 };
      }
      acc[barcode].quantity += sale.quantity;
      return acc;
    }, {});

    const csvRows = [
      ['Barcode', 'Quantity'], // Header
      ...Object.values(aggregatedSales).sort((a, b) => a.barcode.localeCompare(b.barcode)).map(sale => [sale.barcode, sale.quantity])
    ];
    const csvString = csvRows.map(row => row.join(',')).join('\n');
    return new Blob([csvString], { type: 'text/csv' });
  };

  const downloadCSV = (supplier) => {
    let filteredSales = sales.filter(sale => {
      const h = parseFloat(sale.home_hardware_actual_price);
      const t = parseFloat(sale.toolbank_actual_price);
      const s = parseFloat(sale.stax_actual_price);
  
      const prices = [h, t, s].filter(p => !isNaN(p));
      const min = Math.min(...prices);
  
      if (supplier === 'home') {
        return !isNaN(h) && h === min;
      } else if (supplier === 'toolbank') {
        return !isNaN(t) && t === min;
      } else if (supplier === 'stax') {
        return !isNaN(s) && s === min;
      }
      return false;
    });
    
    const blob = generateCSVBlob(filteredSales);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${supplier}_best_actual_sales.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🔍 Weekly Orders with Matches</h1>
      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      {startDate && endDate && (
        <div style={{ margin: '1rem 0' }}>
          <strong>Total Matches: </strong>{itemCount}
        </div>
      )}
      {sales.length > 0 && (
        <div style={{ margin: '1rem 0' }}>
          <strong>Total Home Actual: </strong> £{homeTotal.toFixed(2)} <br />
          <strong>Total Home Best Actual: </strong> £{homeBestTotal.toFixed(2)} 
          <button onClick={() => downloadCSV('home')}>Export CSV</button>
          <br />
          <strong>Total Toolbank Actual: </strong> £{toolbankTotal.toFixed(2)} <br />
          <strong>Total Toolbank Best Actual: </strong> £{toolbankBestTotal.toFixed(2)} 
          <button onClick={() => downloadCSV('toolbank')}>Export CSV</button>
          <br />
          <strong>Total Stax Actual: </strong> £{staxTotal.toFixed(2)} <br />
          <strong>Total Stax Best Actual: </strong> £{staxBestTotal.toFixed(2)} 
          <button onClick={() => downloadCSV('stax')}>Export CSV</button>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr>
            <th style={th}>Barcode</th>
            <th style={th}>Product Name</th>
            <th style={th}>Quantity</th>
            <th style={th}>Order Date</th>
            <th style={th}>Home Price</th>
            <th style={th}>Home Actual</th>
            <th style={th}>Toolbank Price</th>
            <th style={th}>Toolbank Actual</th>
            <th style={th}>Stax Actual</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td style={td}>{sale.barcode}</td>
              <td style={td}>
                <div onClick={() => (sale.home_hardware_name || sale.toolbank_name || sale.stax_name) && toggleExpand(sale.id)} style={{ cursor: sale.home_hardware_name || sale.toolbank_name || sale.stax_name ? 'pointer' : 'default' }}>
                  {sale.product_name}
                  {(sale.home_hardware_name || sale.toolbank_name || sale.stax_name) && (
                    <span style={{ marginLeft: '0.5rem', color: '#888' }}>
                      {expandedRows[sale.id] ? '−' : '+'}
                    </span>
                  )}
                </div>
                {expandedRows[sale.id] && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9em', color: '#555' }}>
                    {sale.home_hardware_name && <div><strong>Home:</strong> {sale.home_hardware_name}</div>}
                    {sale.toolbank_name && <div><strong>Toolbank:</strong> {sale.toolbank_name}</div>}
                    {sale.stax_name && <div><strong>Stax:</strong> {sale.stax_name}</div>}
                  </div>
                )}
              </td>
              <td style={td}>{sale.quantity}</td>
              <td style={td}>{sale.order_date}</td>
              <td style={td}>
                {sale.home_hardware_price != null ? `£${parseFloat(sale.home_hardware_price).toFixed(2)}` : ''}
              </td>
              <td style={{ ...td, ...getHighlightStyle(sale.home_hardware_actual_price, sale.toolbank_actual_price, sale.stax_actual_price, 'home') }}>
                {sale.home_hardware_actual_price != null ? `£${parseFloat(sale.home_hardware_actual_price).toFixed(2)}` : ''}
              </td>
              <td style={td}>
                {sale.toolbank_price != null ? `£${parseFloat(sale.toolbank_price).toFixed(2)}` : ''}
              </td>
              <td style={{ ...td, ...getHighlightStyle(sale.home_hardware_actual_price, sale.toolbank_actual_price, sale.stax_actual_price, 'toolbank') }}>
                {sale.toolbank_actual_price != null ? `£${parseFloat(sale.toolbank_actual_price).toFixed(2)}` : ''}
              </td>
              <td style={{ ...td, ...getHighlightStyle(sale.home_hardware_actual_price, sale.toolbank_actual_price, sale.stax_actual_price, 'stax') }}>
                {sale.stax_actual_price != null ? `£${parseFloat(sale.stax_actual_price).toFixed(2)}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const th = {
  borderBottom: '2px solid #ccc',
  textAlign: 'left',
  padding: '8px',
  position: 'sticky',
  top: 0,
  background: '#fff',
  zIndex: 2,
}

const td = {
  borderBottom: '1px solid #eee',
  padding: '8px',
}