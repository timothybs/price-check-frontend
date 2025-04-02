import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export default function WeeklyOrders() {
  const [sales, setSales] = useState([])

  useEffect(() => {
    const fetchSales = async () => {
      const { data, error } = await supabase
        .from('weekly_sales')
        .select('*')
        .order('order_date', { ascending: false })

      if (error) {
        console.error('❌ Error fetching sales:', error.message)
      } else {
        setSales(data)
      }
    }

    fetchSales()
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <h1>📦 Weekly Orders (Stub)</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr>
            <th style={th}>Barcode</th>
            <th style={th}>Product Name</th>
            <th style={th}>Quantity</th>
            <th style={th}>Order Date</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td style={td}>{sale.barcode}</td>
              <td style={td}>{sale.product_name}</td>
              <td style={td}>{sale.quantity}</td>
              <td style={td}>{sale.order_date}</td>
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
}

const td = {
  borderBottom: '1px solid #eee',
  padding: '8px',
}
