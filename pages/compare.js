import { useEffect, useState } from 'react'

export default function PriceCompare() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_KEY
    )

    const load = async () => {
      const { data, error } = await supabase
        .from('competitor_price_comparison')
        .select('*')
        .order('fetched_at', { ascending: false })

      if (error) console.error('❌ Supabase error:', error)
      else setRows(data)

      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ padding: 20 }}>
      <h1>📊 Price Comparison</h1>
      <table border="1" cellPadding="6" cellSpacing="0" style={{ width: '100%', marginTop: 20 }}>
        <thead>
          <tr>
            <th>Product</th>
            <th>Barcode</th>
            <th>Shopify</th>
            <th>Competitor</th>
            <th>Difference</th>
            <th>% Diff</th>
            <th>Source</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {

const priceDiff = r.shopify_price - r.competitor_price
const percentDiff = (priceDiff / r.competitor_price) * 100

let backgroundColor = '#ffffff'

if (r.shopify_price < r.competitor_price) {
  backgroundColor = '#ffdddd' // 🔴 We're cheaper — warning
} else if (percentDiff > 15) {
  backgroundColor = '#fff4cc' // 🟡 More than 15% more
} else {
  backgroundColor = '#ddffdd' // 🟢 Within 10% or matched
}

const diffStyle = { backgroundColor, fontWeight: 'bold' }

            return (
              <tr key={r.competitor_price_id}>
                <td>{r.title}</td>
                <td>{r.barcode}</td>
                <td>£{r.shopify_price}</td>
                <td>£{r.competitor_price}</td>
                <td style={diffStyle}>£{r.price_difference}</td>
                <td style={diffStyle}>{r.percent_difference}%</td>
                <td>{r.source}</td>
                <td><a href={r.competitor_url} target="_blank">🔗</a></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
