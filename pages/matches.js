import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

console.log('🔑 URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('🔑 KEY:', process.env.NEXT_PUBLIC_SUPABASE_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export default function WeeklyOrdersWithMatches() {
  const [sales, setSales] = useState([])
  const [expandedRows, setExpandedRows] = useState({})

  const toggleExpand = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    const fetchSales = async () => {
      const { data, error } = await supabase
        .from('weekly_sales_with_matches')
        .select('*')
        .order('order_date', { ascending: false })

      if (error) {
        console.error('❌ Error fetching matched sales:', error.message)
      } else {
        setSales(data)
      }
    }

    fetchSales()
  }, [])

  const getHighlightStyle = (homePrice, toolbankPrice, source) => {
    const h = parseFloat(homePrice)
    const t = parseFloat(toolbankPrice)

    if (isNaN(h) || isNaN(t)) return {}

    if (source === 'home' && h < t) return { backgroundColor: '#d4edda' }
    if (source === 'toolbank' && t < h) return { backgroundColor: '#d4edda' }

    return {}
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🔍 Weekly Orders with Matches</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr>
            <th style={th}>Barcode</th>
            <th style={th}>Product Name</th>
            <th style={th}>Quantity</th>
            <th style={th}>Order Date</th>
            <th style={th}>Home Hardware Name</th>
            <th style={th}>Home Price</th>
            <th style={th}>Home Discount</th>
            <th style={th}>Home Actual</th>
            <th style={th}>Toolbank Name</th>
            <th style={th}>Toolbank Price</th>
            <th style={th}>Toolbank Discount</th>
            <th style={th}>Toolbank Actual</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td style={td}>{sale.barcode}</td>
              <td style={td}>
                <div onClick={() => (sale.home_hardware_name || sale.toolbank_name) && toggleExpand(sale.id)} style={{ cursor: sale.home_hardware_name || sale.toolbank_name ? 'pointer' : 'default' }}>
                  {sale.product_name}
                  {(sale.home_hardware_name || sale.toolbank_name) && (
                    <span style={{ marginLeft: '0.5rem', color: '#888' }}>
                      {expandedRows[sale.id] ? '−' : '+'}
                    </span>
                  )}
                </div>
                {expandedRows[sale.id] && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9em', color: '#555' }}>
                    {sale.home_hardware_name && <div><strong>Home:</strong> {sale.home_hardware_name}</div>}
                    {sale.toolbank_name && <div><strong>Toolbank:</strong> {sale.toolbank_name}</div>}
                  </div>
                )}
              </td>
              <td style={td}>{sale.quantity}</td>
              <td style={td}>{sale.order_date}</td>
              <td style={td}>{sale.home_hardware_name}</td>
              <td style={td}>{sale.home_hardware_price}</td>
              <td style={td}>{sale.home_hardware_discount}</td>
              <td style={{ ...td, ...getHighlightStyle(sale.home_hardware_actual_price, sale.toolbank_actual_price, 'home') }}>
                {sale.home_hardware_actual_price}
              </td>
              <td style={td}>{sale.toolbank_name}</td>
              <td style={td}>{sale.toolbank_price}</td>
              <td style={td}>{sale.toolbank_discount}</td>
              <td style={{ ...td, ...getHighlightStyle(sale.home_hardware_actual_price, sale.toolbank_actual_price, 'toolbank') }}>
                {sale.toolbank_actual_price}
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
}

const td = {
  borderBottom: '1px solid #eee',
  padding: '8px',
}