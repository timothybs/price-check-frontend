import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

const CreateLog = () => {
  const [log, setLog] = useState([]);

  useEffect(() => {
    const fetchLog = async () => {
      const { data, error } = await supabase
        .from('product_editor_creates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching create log:', error.message);
      } else {
        setLog(data);
      }
    };

    fetchLog();
  }, []);

  return (
    <div style={{ padding: '20px', fontSize: '16px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '20px' }}>Created Products</h1>
      {log.length === 0 ? (
        <p>No created products logged yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>Product ID</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Variant ID</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Title</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {log.map((entry, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{entry.product_id}</td>
                <td style={{ padding: '8px' }}>{entry.variant_id}</td>
                <td style={{ padding: '8px' }}>{entry.title}</td>
                <td style={{ padding: '8px' }}>{new Date(entry.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CreateLog;