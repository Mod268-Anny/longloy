import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import API_URL, { secureLocalFetch } from '../config';

function ActivityHistory({ token, userId, show, onHide }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && userId) {
      fetchActivities();
    }
  }, [show, userId]);

  const fetchActivities = () => {
    setLoading(true);
    secureLocalFetch(`${API_URL}/admin/user-activity/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.activities) {
          setActivities(data.activities);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  };

  const getActionColor = (action) => {
    switch(action) {
      case 'edit_points': return 'warning';
      case 'change_role': return 'info';
      case 'ban_user': return 'danger';
      case 'unban_user': return 'success';
      case 'verify_entrepreneur': return 'success';
      default: return 'secondary';
    }
  };

  const getActionLabel = (action) => {
    switch(action) {
      case 'edit_points': return 'แก้ไขแต้ม';
      case 'change_role': return 'เปลี่ยนบทบาท';
      case 'ban_user': return 'แบนผู้ใช้';
      case 'unban_user': return 'ยกเลิกการแบน';
      case 'verify_entrepreneur': return 'อนุมัติผู้ประกอบการ';
      default: return action;
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>ประวัติกิจกรรมของผู้ใช้</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">กำลังโหลด...</span>
            </Spinner>
          </div>
        ) : activities.length > 0 ? (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="table table-sm" style={{ marginBottom: 0 }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa' }}>
                  <th>วันที่และเวลา</th>
                  <th>การทำงาน</th>
                  <th>Admin</th>
                  <th>ค่าเดิม → ค่าใหม่</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity, index) => (
                  <tr key={index}>
                    <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {new Date(activity.created_at).toLocaleString('th-TH')}
                    </td>
                    <td>
                      <Badge bg={getActionColor(activity.action)}>
                        {getActionLabel(activity.action)}
                      </Badge>
                      {activity.description && (
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '3px' }}>
                          {activity.description}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {activity.admin_name && (
                        <>
                          {activity.admin_name} {activity.admin_lastname}
                          <div style={{ fontSize: '0.75rem', color: '#999' }}>
                            (ID: {activity.admin_id})
                          </div>
                        </>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {activity.old_value && activity.new_value ? (
                        <>
                          <span style={{ color: '#999' }}>{activity.old_value}</span>
                          <span style={{ margin: '0 5px' }}>→</span>
                          <span style={{ color: '#4b8ff4', fontWeight: 'bold' }}>{activity.new_value}</span>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            <i className="fas fa-history" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }}></i>
            ไม่มีประวัติกิจกรรม
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          ปิด
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ActivityHistory;
