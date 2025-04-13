// pages/editor-log.js
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;   
const supabase = createClient(supabaseUrl, supabaseKey);

const EditorLog = () => {
  const [log, setLog] = useState([]);

  useEffect(() => {
    const fetchLog = async () => {
      const { data, error } = await supabase
        .from('product_editor_changes')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching editor log:', error.message);
      } else {
        setLog(data);
      }
    };

    fetchLog();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Product Editor Change Log</h1>
      {log.length === 0 ? (
        <p>No changes recorded yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Product ID</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Variant ID</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Updated By</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Updated At</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Raw Data</th>
            </tr>
          </thead>
          <tbody>
            {log.map((entry, index) => (
              <tr key={index}>
                <td>{entry.product_id}</td>
                <td>{entry.variant_id}</td>
                <td>{entry.updated_by}</td>
                <td>{new Date(entry.updated_at).toLocaleString()}</td>
                <td><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(entry.changes || {}, null, 2)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EditorLog;
