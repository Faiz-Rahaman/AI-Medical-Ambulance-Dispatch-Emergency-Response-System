// src/utils/notificationService.js

const STORAGE_KEY = 'ambulance_custom_notifications';
const READ_KEY = 'ambulance_read_notification_ids';

export const getCustomNotifications = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error reading custom notifications:', e);
        return [];
    }
};

export const saveCustomNotification = (notification) => {
    try {
        const existing = getCustomNotifications();
        const updated = [notification, ...existing].slice(0, 50); // Keep max 50
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        
        // Dispatch window event so NotificationDropdown updates immediately
        window.dispatchEvent(new CustomEvent('ambulance_notification', { detail: notification }));
        return updated;
    } catch (e) {
        console.error('Error saving notification:', e);
        return [];
    }
};

export const getReadNotificationIds = () => {
    try {
        const stored = localStorage.getItem(READ_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const markNotificationAsRead = (id) => {
    try {
        const readIds = getReadNotificationIds();
        if (!readIds.includes(id)) {
            const updated = [...readIds, id];
            localStorage.setItem(READ_KEY, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('ambulance_notifications_read_updated'));
            return updated;
        }
        return readIds;
    } catch (e) {
        return [];
    }
};

export const markAllNotificationsAsRead = (allIds) => {
    try {
        localStorage.setItem(READ_KEY, JSON.stringify(allIds));
        window.dispatchEvent(new CustomEvent('ambulance_notifications_read_updated'));
    } catch (e) {
        console.error('Error marking all notifications as read:', e);
    }
};

export const emitCaseCreatedNotification = (caseData) => {
    const notif = {
        id: `case-created-${caseData.id || Date.now()}`,
        title: `Emergency Case #${caseData.id || ''} Created`,
        description: `Patient: ${caseData.patient_name || 'Emergency Patient'} - Triage: ${caseData.triage_level || 'Emergency'} (${caseData.ambulance_type || 'Basic'} Ambulance required)`,
        category: 'case',
        type: 'danger',
        icon: 'ri-alarm-warning-line',
        timestamp: new Date().toISOString(),
        timeDisplay: 'Just now',
        link: '/cases'
    };
    saveCustomNotification(notif);
};

export const emitAmbulanceReachedNotification = (caseId, patientName, ambulanceNumber) => {
    const notif = {
        id: `amb-reached-${caseId}-${Date.now()}`,
        title: `Ambulance Reached Destination`,
        description: `Ambulance ${ambulanceNumber || ''} has arrived on site for Case #${caseId} (${patientName || 'Patient'}). Paramedics on scene.`,
        category: 'dispatch',
        type: 'success',
        icon: 'ri-checkbox-circle-line',
        timestamp: new Date().toISOString(),
        timeDisplay: 'Just now',
        link: '/cases'
    };
    saveCustomNotification(notif);
};
