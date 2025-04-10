import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export default function ToolstreamOrders() {
  const [toolstreamSales, setToolstreamSales] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    const fetchToolstreamSales = async () => {
      const { data, error } = await supabase
        .from('toolstream_orders_mv')
        .select('*');
      if (error) {
        console.error('❌ Error fetching Toolstream sales:', error.message)
      } else {
        console.log('✅ Toolstream Sales data:', data)
        const filteredData = data.filter(sale => {
          const orderDate = new Date(sale.order_date);
          return (!startDate || orderDate >= new Date(startDate)) &&
                 (!endDate || orderDate <= new Date(endDate));
        });

        const groupedData = filteredData.reduce((acc, sale) => {
          const barcode = sale.barcode;
          if (!acc[barcode]) {
            acc[barcode] = { ...sale, quantity_sold: 0 };
          }
          acc[barcode].quantity_sold += sale.quantity;
          return acc;
        }, {});

        setToolstreamSales(Object.values(groupedData));
      }
    }

    fetchToolstreamSales()
  }, [startDate, endDate])

  const exportCSV = () => {
    const csvData = toolstreamSales.map(sale => ({
      variant_sku: sale.product,
      quantity: sale.quantity_sold
    }));

    const csvHeaders = 'variant_sku,quantity\n';
    const csvRows = csvData.reduce((acc, row) => {
      if (!acc[row.variant_sku]) {
        acc[row.variant_sku] = { variant_sku: row.variant_sku, quantity: 0 };
      }
      acc[row.variant_sku].quantity += row.quantity;
      return acc;
    }, {});

    const csvString = csvHeaders + Object.values(csvRows).map(row => `${row.variant_sku},${row.quantity}`).join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'toolstream_orders.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🔍 Toolstream Orders Report</h1>
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
      {startDate && endDate && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr>
              <th style={th}>Barcode</th>
              <th style={th}>Product</th>
              <th style={th}>Description</th>
              <th style={th}>Net Price</th>
              <th style={th}>Quantity Sold</th>
            </tr>
          </thead>
          <tbody>
            {toolstreamSales.map((sale) => (
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