const fs = require('fs');
const path = require('path');

const schedulesPath = path.join(__dirname, 'schedules.json');

function loadSchedules() {
    try {
        let data = fs.readFileSync(schedulesPath, 'utf8');
        return JSON.parse(data).scheduled || [];
    } catch (err) {
        return [];
    }
}

function saveSchedules(scheduled) {
    fs.writeFileSync(schedulesPath, JSON.stringify({ scheduled }, null, 2));
}

function addSchedule(schedule) {
    let schedules = loadSchedules();
    schedule.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    schedules.push(schedule);
    saveSchedules(schedules);
    return schedule.id;
}

function removeSchedule(id) {
    let schedules = loadSchedules();
    let index = schedules.findIndex(s => s.id === id);
    if (index > -1) {
        schedules.splice(index, 1);
        saveSchedules(schedules);
        return true;
    }
    return false;
}

function getSchedulesByUser(userId) {
    return loadSchedules().filter(s => s.userId === userId);
}

function getDueSchedules() {
    let now = Date.now();
    return loadSchedules().filter(s => s.sendAt <= now);
}

function parseTime(timeStr) {
    let total = 0;
    let regex = /(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks)/gi;
    let match;

    while ((match = regex.exec(timeStr)) !== null) {
        let value = parseInt(match[1]);
        let unit = match[2].toLowerCase();

        if (unit.startsWith('s')) total += value * 1000;
        else if (unit.startsWith('m')) total += value * 60 * 1000;
        else if (unit.startsWith('h')) total += value * 60 * 60 * 1000;
        else if (unit.startsWith('d')) total += value * 24 * 60 * 60 * 1000;
        else if (unit.startsWith('w')) total += value * 7 * 24 * 60 * 60 * 1000;
    }

    return total;
}

function formatDuration(ms) {
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function formatTime(timestamp) {
    let date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

module.exports = {
    loadSchedules,
    saveSchedules,
    addSchedule,
    removeSchedule,
    getSchedulesByUser,
    getDueSchedules,
    parseTime,
    formatDuration,
    formatTime
};
