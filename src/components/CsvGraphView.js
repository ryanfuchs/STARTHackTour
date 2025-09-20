import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Cosmograph } from '@cosmograph/react';
import Papa from 'papaparse';
import './CsvGraphView.css';

const CsvGraphView = () => {
  const [csvData, setCsvData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  // Auto-load sample data on component mount
  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/sample-data.csv');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            // Validate required columns
            const requiredColumns = ['title', 'parent', 'value', 'timestamp'];
            const headers = results.meta.fields || Object.keys(results.data[0] || {});
            
            const missingColumns = requiredColumns.filter(col => 
              !headers.some(header => header.toLowerCase() === col.toLowerCase())
            );

            if (missingColumns.length > 0) {
              throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
            }

            // Process the data
            const processedData = results.data.map((row, index) => ({
              id: row.title || `node-${index}`,
              title: row.title,
              parent: row.parent,
              value: parseFloat(row.value) || 0,
              timestamp: row.timestamp,
              originalIndex: index
            })).filter(row => row.title);

            setCsvData(processedData);
            setFileInfo({
              name: 'Tech Industry News Sample',
              size: csvText.length,
              rows: processedData.length,
              columns: headers.length
            });

          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
          setLoading(false);
        }
      });

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // Validate required columns
          const requiredColumns = ['title', 'parent', 'value', 'timestamp'];
          const headers = results.meta.fields || Object.keys(results.data[0] || {});
          
          const missingColumns = requiredColumns.filter(col => 
            !headers.some(header => header.toLowerCase() === col.toLowerCase())
          );

          if (missingColumns.length > 0) {
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
          }

          // Process the data
          const processedData = results.data.map((row, index) => ({
            id: row.title || `node-${index}`,
            title: row.title,
            parent: row.parent,
            value: parseFloat(row.value) || 0,
            timestamp: row.timestamp,
            originalIndex: index
          })).filter(row => row.title); // Remove empty rows

          setCsvData(processedData);
          setFileInfo({
            name: file.name,
            size: file.size,
            rows: processedData.length,
            columns: headers.length
          });

        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
        setLoading(false);
      }
    });
  }, []);

  const handleApiLoad = useCallback(async () => {
    const apiUrl = prompt('Enter API URL for CSV data:');
    if (!apiUrl) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            // Validate required columns
            const requiredColumns = ['title', 'parent', 'value', 'timestamp'];
            const headers = results.meta.fields || Object.keys(results.data[0] || {});
            
            const missingColumns = requiredColumns.filter(col => 
              !headers.some(header => header.toLowerCase() === col.toLowerCase())
            );

            if (missingColumns.length > 0) {
              throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
            }

            // Process the data
            const processedData = results.data.map((row, index) => ({
              id: row.title || `node-${index}`,
              title: row.title,
              parent: row.parent,
              value: parseFloat(row.value) || 0,
              timestamp: row.timestamp,
              originalIndex: index
            })).filter(row => row.title);

            setCsvData(processedData);
            setFileInfo({
              name: 'API Data',
              size: csvText.length,
              rows: processedData.length,
              columns: headers.length
            });

          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
          setLoading(false);
        }
      });

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Transform data for Cosmograph
  const { nodes, links } = useMemo(() => {
    if (!csvData) return { nodes: [], links: [] };

    // Create nodes with chart colors and better grouping
    const chartColors = ['#748BB8', '#9EAECE', '#D6DDEA', '#B0926D', '#8EA4B7', '#D8C9B6'];
    
    // Group nodes by parent for better organization
    const parentGroups = {};
    csvData.forEach((row, index) => {
      const parentId = row.parent || 'root';
      if (!parentGroups[parentId]) {
        parentGroups[parentId] = [];
      }
      parentGroups[parentId].push({ row, index });
    });

    const nodes = csvData.map((row, index) => {
      const parentGroup = parentGroups[row.parent || 'root'];
      const groupIndex = parentGroup.findIndex(item => item.row.id === row.id);
      const groupSize = parentGroup.length;
      
      return {
        id: row.id,
        title: row.title,
        value: row.value,
        timestamp: row.timestamp,
        parent: row.parent,
        // Use chart colors based on value range
        color: row.value > 70 ? '#748BB8' : 
               row.value > 50 ? '#9EAECE' : 
               row.value > 30 ? '#D6DDEA' : 
               row.value > 0 ? '#B0926D' : 
               row.value > -30 ? '#8EA4B7' : '#D8C9B6',
        size: 2,
        // Add grouping information for better layout
        group: row.parent || 'root',
        groupIndex: groupIndex,
        groupSize: groupSize
      };
    });

    // Create links based on parent-child relationships with stronger grouping
    const links = [];
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    csvData.forEach(row => {
      if (row.parent && row.parent.trim() !== '') {
        const parentNode = nodeMap.get(row.parent);
        if (parentNode) {
          links.push({
            source: row.parent,
            target: row.id,
            value: Math.abs(row.value),
            // Strengthen parent-child links for better grouping
            strength: 1.2,
            distance: 200
          });
        }
      }
    });

    // Add intra-group links to keep siblings closer together
    Object.values(parentGroups).forEach(group => {
      if (group.length > 1) {
        for (let i = 0; i < group.length - 1; i++) {
          const node1 = group[i].row;
          const node2 = group[i + 1].row;
          links.push({
            source: node1.id,
            target: node2.id,
            value: 1,
            // Weaker links between siblings but closer distance
            strength: 0.6,
            distance: 120,
            type: 'sibling'
          });
        }
      }
    });

    return { nodes, links };
  }, [csvData]);

  const resetData = useCallback(() => {
    setCsvData(null);
    setFileInfo(null);
    setError(null);
  }, []);

  return (
    <div className="csv-graph-view">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading sample data...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="graph-container">
        {csvData ? (
          <Cosmograph
            nodes={nodes}
            links={links}
            nodeColor={(d) => d.color}
            nodeSize={(d) => d.size}
            linkWidth={1.5}
            linkColor="#9EAECE"
            backgroundColor="#FFFFFF"
            spaceSize={16384}
            simulationRepulsion={12.0}
            simulationGravity={0.001}
            simulationDecay={0.003}
            simulationSpeed={0.15}
            linkDistance={600}
            nodeTooltip={(d) => `
              <div style="padding: 12px; background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(241,241,242,0.9) 100%); border-radius: 8px; box-shadow: 0 4px 16px rgba(116,139,184,0.2); border: 1px solid rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px);">
                <strong style="color: white; font-size: 14px;">${d.title}</strong><br/>
                <span style="color: white; font-size: 12px;">Value: ${d.value}</span><br/>
                <span style="color: white; font-size: 12px;">Parent: ${d.parent || 'None'}</span><br/>
                <span style="color: white; font-size: 12px;">Timestamp: ${d.timestamp}</span>
              </div>
            `}
          />
        ) : (
          <div className="graph-placeholder">
            <div className="placeholder-icon">📊</div>
            <h3>Loading Sample Data...</h3>
            <p>Tech Industry News visualization will appear here</p>
          </div>
        )}
      </div>

      <div className="csv-graph-controls">
        <div className="upload-section">
          <label htmlFor="csv-file" className="upload-label">
            <span className="upload-icon">📁</span>
            Choose CSV File
          </label>
          <input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="file-input"
            disabled={loading}
          />
          
          <button 
            onClick={handleApiLoad}
            className="btn btn-api"
            disabled={loading}
          >
            <span className="btn-icon">🌐</span>
            Load from API
          </button>

          <button 
            onClick={loadSampleData}
            className="btn btn-sample"
          >
            <span className="btn-icon">📊</span>
            Load Sample
          </button>

          {csvData && (
            <button 
              onClick={resetData}
              className="btn btn-reset"
            >
              <span className="btn-icon">🔄</span>
              Reset
            </button>
          )}
        </div>

        {fileInfo && (
          <div className="file-info">
            <h4>Data Info</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">File:</span>
                <span className="info-value">{fileInfo.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Rows:</span>
                <span className="info-value">{fileInfo.rows}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Columns:</span>
                <span className="info-value">{fileInfo.columns}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Nodes:</span>
                <span className="info-value">{nodes.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Connections:</span>
                <span className="info-value">{links.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvGraphView;
