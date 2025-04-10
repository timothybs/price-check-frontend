import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export default function WilsonsOrders() {
  const [wilsonsSales, setWilsonsSales] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    const fetchWilsonsSales = async () => {
      if (startDate && endDate) {
        const { data, error } = await supabase
          .from('wilsons_orders_mv')
          .select('*')
          .gte('last_order_date', startDate)
          .lte('last_order_date', endDate)
        if (error) {
          console.error('❌ Error fetching Wilsons sales:', error.message)
        } else {
          console.log('✅ Wilsons Sales data:', data)
          setWilsonsSales(data)
        }
      }
    }

    fetchWilsonsSales()
  }, [startDate, endDate])

  const exportCSV = () => {
    const csvData = wilsonsSales.map(sale => ({
      variant_sku: sale.product,
      quantity: sale.quantity_sold
    }));

    const csvHeaders = 'code,qty\n';
    const csvRows = csvData.map(row => `${row.variant_sku},${row.quantity}`).join('\n');
    const csvString = csvHeaders + csvRows;

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'wilsons_orders.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🔍 Wilsons Orders Report</h1>
      <div>
        <label>
          Start Date:
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End Date:
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>
      <button onClick={exportCSV} style={{ margin: '1rem 0' }}>Export CSV</button>
      {startDate && endDate && wilsonsSales.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr>
              <th style={th}>Barcode</th>
              <th style={th}>Product</th>
              <th style={th}>Description</th>
              <th style={th}>Unit Price</th>
              <th style={th}>Quantity Sold</th>
            </tr>
          </thead>
          <tbody>
            {wilsonsSales.map((sale) => (
              <tr key={sale.barcode}>
                <td style={td}>{sale.barcode}</td>
                <td style={td}>{sale.product}</td>
                <td style={td}>{sale.description}</td>
                <td style={td}>{sale.nett_price != null ? `£${parseFloat(sale.nett_price).toFixed(2)}` : ''}</td>
                <td style={td}>{sale.quantity_sold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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