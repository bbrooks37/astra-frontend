import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plane, PlusCircle, Navigation, Calendar, PenTool, BookOpen, Search, History as HistoryIcon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [aircraft, setAircraft] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [flightLogs, setFlightLogs] = useState([]); 
  const [activeTab, setActiveTab] = useState('due-list'); 
  const [showForm, setShowForm] = useState(false);
  const [showSignOff, setShowSignOff] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // NEW STATE: For History Modal
  const [historyData, setHistoryData] = useState([]);
  const [showHistory, setShowHistory] = useState(null);

  const [formData, setFormData] = useState({
    departure_icao: '', arrival_icao: '', flight_time: '', fuel_burn_lbs: '',
    date: new Date().toISOString().split('T')[0], pic_name: 'Xavier', squawks: ''
  });

  const [maintData, setMaintData] = useState({
    technician_name: '', work_order_ref: '', notes: ''
  });

  const fetchData = async () => {
    try {
      const status = await axios.get(`${API_BASE}/`);
      const maint = await axios.get(`${API_BASE}/maintenance`);
      const logs = await axios.get(`${API_BASE}/logs/flights`); 
      setAircraft(status.data);
      setMaintenance(maint.data);
      setFlightLogs(logs.data);
    } catch (err) {
      console.error("Connection Error", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- LOGIC HELPERS ---

  const fetchHistory = async (task) => {
    try {
      const response = await axios.get(`${API_BASE}/maintenance/${task.id}/history`);
      setHistoryData(response.data);
      setShowHistory(task);
    } catch (err) {
      console.error("Error fetching history:", err);
      alert("Could not load history for this task.");
    }
  };

  const getProgressStats = (remaining) => {
    if (remaining === null) return { percent: 0, color: 'secondary' };
    const remain = parseFloat(remaining);
    if (remain <= 0) return { percent: 100, color: 'danger' }; 
    if (remain <= 25) return { percent: 85, color: 'warning' }; 
    if (remain <= 75) return { percent: 50, color: 'info' };    
    return { percent: 25, color: 'success' };                 
  };

  const filteredMaintenance = maintenance.filter(item => 
    item.task_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.equipment_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalTasks = maintenance.length;
  const overdueTasks = maintenance.filter(item => {
      const remain = item.next_due_hours ? (item.next_due_hours - (aircraft?.current_aftt || 0)) : 1;
      return remain <= 0;
  }).length;
  const healthPercent = totalTasks > 0 ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100) : 100;

  // --- HANDLERS ---

  const handleFlightSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/logs/submit`, {
        ...formData,
        flight_time: parseFloat(formData.flight_time),
        fuel_burn_lbs: parseInt(formData.fuel_burn_lbs || 0)
      });
      setShowForm(false);
      fetchData();
    } catch (err) { alert("Error submitting log."); }
  };

  const handleSignOffSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/maintenance/complete`, {
        item_id: showSignOff.id,
        completion_date: new Date().toISOString().split('T')[0],
        completion_hours: aircraft.current_aftt,
        ...maintData
      });
      setShowSignOff(null);
      fetchData();
    } catch (err) { alert("Error signing off task."); }
  };

  if (!aircraft) return <div className="p-5 text-center text-white bg-dark vh-100">Syncing N528RR Systems...</div>;

  return (
    <div className="bg-light min-vh-100 w-100 m-0 p-0 overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-dark shadow-sm py-3 px-4 w-100">
        <span className="navbar-brand d-flex align-items-center gap-2 m-0">
          <Plane className="text-primary" /> <strong className="h4 mb-0 font-monospace">ASTRA FLEET OPS</strong>
        </span>
        <button className="btn btn-primary fw-bold shadow-sm" onClick={() => setShowForm(!showForm)}>
          <PlusCircle size={18} className="me-2" /> {showForm ? "CANCEL" : "LOG FLIGHT"}
        </button>
      </nav>

      <div className="container-fluid p-4">
        
        {/* Analytics Row */}
        <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-primary border-5 p-3 bg-white h-100">
                <small className="text-muted fw-bold text-uppercase">Current AFTT</small>
                <h1 className="text-primary font-monospace mb-0 display-6">{aircraft.current_aftt.toFixed(1)}</h1>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-success border-5 p-3 bg-white h-100">
                <small className="text-muted fw-bold text-uppercase">Total Cycles</small>
                <h1 className="text-success font-monospace mb-0 display-6">{aircraft.total_cycles || '---'}</h1>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm border-0 border-start border-info border-5 p-3 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted fw-bold text-uppercase">Fleet Compliance Health</small>
                    <span className="badge bg-info-light text-info fw-bold">{healthPercent}% Ready</span>
                </div>
                <div className="progress" style={{height: '15px'}}>
                    <div className="progress-bar bg-info progress-bar-striped progress-bar-animated" style={{width: `${healthPercent}%`}}></div>
                </div>
              </div>
            </div>
        </div>

        {/* Tab Selection & Search */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div className="d-flex gap-2">
            <button 
              className={`btn fw-bold px-4 rounded-pill ${activeTab === 'due-list' ? 'btn-dark shadow' : 'btn-outline-secondary bg-white'}`}
              onClick={() => setActiveTab('due-list')}
            >
              <Calendar size={18} className="me-2" /> STATUS DUE LIST
            </button>
            <button 
              className={`btn fw-bold px-4 rounded-pill ${activeTab === 'logbook' ? 'btn-dark shadow' : 'btn-outline-secondary bg-white'}`}
              onClick={() => setActiveTab('logbook')}
            >
              <BookOpen size={18} className="me-2" /> DIGITAL LOGBOOK
            </button>
          </div>
          
          {activeTab === 'due-list' && (
            <div className="input-group shadow-sm" style={{maxWidth: '400px'}}>
              <span className="input-group-text bg-white border-end-0"><Search size={18} className="text-muted"/></span>
              <input 
                type="text" 
                className="form-control border-start-0" 
                placeholder="Search tasks, descriptions, or systems..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Flight Log Form */}
        {showForm && (
          <div className="card shadow-lg mb-4 border-0 p-4 bg-white">
            <h5 className="fw-bold border-bottom pb-2 mb-3">NEW FLIGHT LOG ENTRY</h5>
            <form onSubmit={handleFlightSubmit} className="row g-3">
                <div className="col-md-2">
                  <label className="small fw-bold">DATE</label>
                  <input type="date" className="form-control" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="col-md-2">
                  <label className="small fw-bold">DEP</label>
                  <input required className="form-control" placeholder="KOKC" value={formData.departure_icao} onChange={e => setFormData({...formData, departure_icao: e.target.value.toUpperCase()})} />
                </div>
                <div className="col-md-2">
                  <label className="small fw-bold">ARR</label>
                  <input required className="form-control" placeholder="KPWA" value={formData.arrival_icao} onChange={e => setFormData({...formData, arrival_icao: e.target.value.toUpperCase()})} />
                </div>
                <div className="col-md-2">
                  <label className="small fw-bold">FLT TIME</label>
                  <input required type="number" step="0.1" className="form-control" value={formData.flight_time} onChange={e => setFormData({...formData, flight_time: e.target.value})} />
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <button className="btn btn-dark w-100 fw-bold py-2 shadow-sm">SUBMIT TO LOGBOOK</button>
                </div>
            </form>
          </div>
        )}

        {/* Data Tables */}
        <div className="card shadow-sm border-0 rounded-3 overflow-hidden w-100 bg-white">
          {activeTab === 'due-list' ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th className="px-4 py-3" style={{width: '15%'}}>Task</th>
                    <th style={{width: '35%'}}>Description</th>
                    <th style={{width: '15%'}}>Next Due</th>
                    <th style={{width: '20%'}}>Compliance Status</th>
                    <th style={{width: '15%'}} className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaintenance.map(item => {
                    const remainingHrs = item.next_due_hours ? (item.next_due_hours - aircraft.current_aftt).toFixed(1) : null;
                    const stats = getProgressStats(remainingHrs);
                    return (
                      <tr key={item.id}>
                        <td className="px-4">
                          <button 
                            className="btn btn-link p-0 fw-bold text-decoration-none text-primary"
                            onClick={() => fetchHistory(item)}
                          >
                            {item.task_number}
                          </button>
                        </td>
                        <td>
                          <div className="fw-bold">{item.description}</div>
                          <small className="text-muted text-uppercase">{item.equipment_type}</small>
                        </td>
                        <td className="font-monospace fw-bold">{item.next_due_hours ? `${item.next_due_hours.toFixed(1)} H` : item.next_due_date}</td>
                        <td>
                          {remainingHrs !== null ? (
                            <div className="w-100">
                                <div className="d-flex justify-content-between mb-1 small fw-bold">
                                    <span className={`text-${stats.color}`}>{remainingHrs} HRS LEFT</span>
                                </div>
                                <div className="progress" style={{height: '8px'}}>
                                    <div className={`progress-bar bg-${stats.color} ${parseFloat(remainingHrs) <= 25 ? 'progress-bar-striped progress-bar-animated' : ''}`} 
                                         style={{width: `${stats.percent}%`}}></div>
                                </div>
                            </div>
                          ) : <span className="text-muted small fw-bold">CALENDAR TRACKED</span>}
                        </td>
                        <td className="text-center">
                          <button className="btn btn-sm btn-outline-dark fw-bold px-3" onClick={() => setShowSignOff(item)}>
                            <PenTool size={14} className="me-1" /> SIGN OFF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 w-100">
                <thead className="table-dark small text-uppercase">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th>Route</th>
                    <th>Flight Time</th>
                    <th>PIC</th>
                    <th>Squawks</th>
                  </tr>
                </thead>
                <tbody>
                  {flightLogs.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-5 text-muted">No flight records found.</td></tr>
                  ) : (
                    flightLogs.map(log => (
                      <tr key={log.id}>
                        <td className="px-4 fw-bold">{log.date}</td>
                        <td>
                          <span className="badge bg-light text-dark border px-2 py-2">{log.departure_icao}</span>
                          <Navigation size={14} className="mx-3 text-muted" />
                          <span className="badge bg-light text-dark border px-2 py-2">{log.arrival_icao}</span>
                        </td>
                        <td className="font-monospace fw-bold">{log.flight_time.toFixed(1)}</td>
                        <td>{log.pic_name}</td>
                        <td className={`small ${log.squawks && log.squawks !== 'None' ? 'text-danger fw-bold' : 'text-muted'}`}>{log.squawks || '---'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title small fw-bold text-uppercase d-flex align-items-center gap-2">
                  <HistoryIcon size={18} /> Compliance History: {showHistory.task_number}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowHistory(null)}></button>
              </div>
              <div className="modal-body p-0">
                <div className="p-3 bg-light border-bottom">
                  <h6 className="mb-0 fw-bold">{showHistory.description}</h6>
                  <small className="text-muted">{showHistory.equipment_type} | Interval: {showHistory.interval_hours || showHistory.interval_months} {showHistory.interval_hours ? 'HRS' : 'MOS'}</small>
                </div>
                <div className="table-responsive" style={{maxHeight: '400px'}}>
                  <table className="table table-striped mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th className="ps-4">Date</th>
                        <th>AFTT</th>
                        <th>Technician</th>
                        <th>Work Order</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.length > 0 ? historyData.map((log) => (
                        <tr key={log.id}>
                          <td className="ps-4 fw-bold">{log.completion_date}</td>
                          <td className="font-monospace">{log.completion_hours.toFixed(1)}</td>
                          <td>{log.technician_name}</td>
                          <td><span className="badge bg-secondary">{log.work_order_ref || 'N/A'}</span></td>
                          <td><small>{log.notes || '---'}</small></td>
                        </tr>
                      )) : (
                        <tr><td colSpan="5" className="text-center py-4 text-muted">No historical records found for this task.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-dark btn-sm fw-bold" onClick={() => setShowHistory(null)}>CLOSE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sign-Off Modal */}
      {showSignOff && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'}}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header bg-dark text-white">
                        <h5 className="modal-title small fw-bold text-uppercase">Maintenance Compliance Sign-Off</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setShowSignOff(null)}></button>
                    </div>
                    <form onSubmit={handleSignOffSubmit}>
                        <div className="modal-body p-4">
                            <p className="small mb-4 text-muted">Signing off <strong>{showSignOff.task_number}</strong> at {aircraft.current_aftt.toFixed(1)} HRS AFTT.</p>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-uppercase">Technician Name</label>
                                <input required className="form-control" onChange={e => setMaintData({...maintData, technician_name: e.target.value})} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-uppercase">Work Order / Ref</label>
                                <input className="form-control" onChange={e => setMaintData({...maintData, work_order_ref: e.target.value})} />
                            </div>
                            <div className="mb-0">
                                <label className="form-label small fw-bold text-uppercase">Compliance Notes</label>
                                <textarea className="form-control" rows="2" onChange={e => setMaintData({...maintData, notes: e.target.value})}></textarea>
                            </div>
                        </div>
                        <div className="modal-footer bg-light">
                            <button type="button" className="btn btn-secondary btn-sm fw-bold" onClick={() => setShowSignOff(null)}>CANCEL</button>
                            <button type="submit" className="btn btn-primary btn-sm fw-bold">SUBMIT & COMPLY</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;