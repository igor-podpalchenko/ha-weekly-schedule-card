console.info("WeeklyScheduleCard 1.0");

class WeeklyScheduleCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.tableInitialized = false;
        this.lastEntityState = null;
        this.scheduleChanged = false;
    }

    setConfig(config) {
        this._config = config;
        this._isCustomJson = false;

        // Check if the entity is a valid JSON string
        try {
            const entityJson = JSON.parse(config.entity);
            if (typeof entityJson === 'object') {
                this._isCustomJson = true;
                this._customEntityState = entityJson;
            }
        } catch (e) {
            // Not a JSON string, proceed as normal
        }

        this.render();
    }

    connectedCallback() {
        this.render();
        this.initializeTable();
        this.updateScheduleOutput();

        // If custom JSON is detected, set encodingFormat and call applySchedule
        if (this._isCustomJson) {
            this.shadowRoot.getElementById('encodingSchema').value = this._config.encodingSchema;
            this.shadowRoot.getElementById('scheduleOutput').value = JSON.stringify(this._customEntityState, null, 2);
            //setTimeout(() => {}, 50);
            this.applySchedule();
        } else {
            this.updateEntityValue(true);
        }
    }

    set hass(hass) {
        this._hass = hass;
        if (this.tableInitialized) {
            this.updateEntityValue(false);
        }
    }

    render() {
        if (!this._config) return;

        const devMode = this._config.devMode || false;
        const initialEncodingSchema = this._config.encodingSchema || 'JSON';

        this.shadowRoot.innerHTML = `
      <style>
        table {
          border-collapse: collapse;
          width: 100%;
        }
        th, td {
          border: 1px solid #ddd;
          text-align: center;
          padding: 0;
          height: 30px;
          width: 40px;
        }
        th {
          background-color: #f2f2f2;
          height: 40px;
          width: 15px !important;
          margin: 0;
          padding: 0;
        }
        .half-hour-container {
          display: flex;
          height: 100%;
          width: 100%;
        }
        .half-hour {
          flex: 1;
          border-right: 1px solid #ddd;
          box-sizing: border-box;
          height: 100%;
        }
        .half-hour:last-child {
          border-right: none;
        }
        .half-hour:hover {
          background-color: #f2f2f2;
          cursor: pointer;
        }
        .half-hour.selected {
          background-color: #4CAF50;
          color: white;
        }
        textarea {
          width: 100%;
          height: 300px;
          margin-top: 10px;
        }
        button {
          margin-top: 10px;
        }
        .dev-mode {
          display: ${devMode ? 'block' : 'none'};
        }
        .update-button {
          display: none;
          margin-top: 10px;
        }
      </style>
      <table id="schedule">
        <thead>
          <tr>
            <th>DAY</th>
            <th>&nbsp;0&nbsp;</th>
            <th>&nbsp;1&nbsp;</th>
            <th>&nbsp;2&nbsp;</th>
            <th>&nbsp;3&nbsp;</th>
            <th>&nbsp;4&nbsp;</th>
            <th>&nbsp;5&nbsp;</th>
            <th>&nbsp;6&nbsp;</th>
            <th>&nbsp;7&nbsp;</th>
            <th>&nbsp;8&nbsp;</th>
            <th>&nbsp;9&nbsp;</th>
            <th>10</th>
            <th>11</th>
            <th>12</th>
            <th>13</th>
            <th>14</th>
            <th>15</th>
            <th>16</th>
            <th>17</th>
            <th>18</th>
            <th>19</th>
            <th>20</th>
            <th>21</th>
            <th>22</th>
            <th>23</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="day-label">MON</td></tr>
          <tr><td class="day-label">TUE</td></tr>
          <tr><td class="day-label">WED</td></tr>
          <tr><td class="day-label">THU</td></tr>
          <tr><td class="day-label">FRI</td></tr>
          <tr><td class="day-label">SAT</td></tr>
          <tr><td class="day-label">SUN</td></tr>
        </tbody>
      </table>
      <div class="dev-mode">
        <select id="encodingSchema" onchange="this.getRootNode().host.handleEncodingChange()">
            <option value="JSON">JSON</option>
            <option value="Devi">Devi</option>
            <option value="Bitmask">Bitmask</option>
            <option value="All">All</option>
        </select>
        <textarea id="scheduleOutput" placeholder="Schedule will be displayed here..."></textarea>
        <button id="applyScheduleButton" onclick="this.getRootNode().host.applySchedule()">Apply Schedule</button>
      </div>
      <button id="updateButton" class="update-button" onclick="this.getRootNode().host.updateSensorValue()">Update</button>
    `;

        // Set initial encoding schema
        this.shadowRoot.getElementById('encodingSchema').value = initialEncodingSchema;
    }

    initializeTable() {
        const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
        const table = this.shadowRoot.getElementById('schedule').getElementsByTagName('tbody')[0];
        let isMouseDown = false;
        let startCell = null;

        table.addEventListener('mousedown', (event) => {
            if (event.target.tagName === 'DIV' && event.target.classList.contains('half-hour')) {
                isMouseDown = true;
                startCell = event.target;
                this.toggleCell(event.target);
                event.preventDefault();
            }
        });

        table.addEventListener('mouseover', (event) => {
            if (isMouseDown && event.target.tagName === 'DIV' && event.target.classList.contains('half-hour')) {
                this.toggleCell(event.target);
            }
        });

        table.addEventListener('mouseup', () => {
            if (isMouseDown) {
                isMouseDown = false;
                startCell = null;
                this.updateScheduleOutput();
                this.showUpdateButton();
            }
        });

        for (let i = 0; i < days.length; i++) {
            const row = table.rows[i];
            row.cells[0].addEventListener('click', () => {
                this.resetDaySchedule(i);
                this.showUpdateButton();
            });
            for (let j = 0; j < 24; j++) {
                const cell = row.insertCell(-1);
                cell.classList.add('selectable');
                cell.innerHTML = '<div class="half-hour-container"><div class="half-hour"></div><div class="half-hour"></div></div>';
            }
        }

        this.tableInitialized = true;
        
        
        // This call may be required when plain JSON is provided, not sendor ID
        if (this._hass) {
            this.updateEntityValue(true);
        }
    }

    updateEntityValue(resetLastState) {
        if (!this._hass || !this._config || !this.tableInitialized) return;
        
        if(resetLastState) // Called by connectedCallback, state is provided by setHass
        	this.lastEntityState = null; 

        const entityState = this._hass.states[this._config.entity];
        if (entityState && (entityState.state !== this.lastEntityState)) { 
            this.lastEntityState = entityState.state;
            this.shadowRoot.getElementById('encodingSchema').value = this._config.encodingSchema;
            this.shadowRoot.getElementById('scheduleOutput').value = entityState.state;

            this.applySchedule();
        }
    }

    toggleCell(cell) {
        cell.classList.toggle('selected');
        this.scheduleChanged = true;
    }

    resetDaySchedule(dayIndex) {
        const table = this.shadowRoot.getElementById('schedule').getElementsByTagName('tbody')[0];
        const row = table.rows[dayIndex];
        for (let j = 1; j <= 24; j++) {
            const cell = row.cells[j];
            const leftHalfHourDiv = cell.querySelector('.half-hour:first-child');
            const rightHalfHourDiv = cell.querySelector('.half-hour:last-child');
            leftHalfHourDiv.classList.remove('selected');
            rightHalfHourDiv.classList.remove('selected');
        }
        this.updateScheduleOutput();
        this.scheduleChanged = true;
    }

    handleEncodingChange() {
        const schema = this.shadowRoot.getElementById('encodingSchema').value;
        const applyButton = this.shadowRoot.getElementById('applyScheduleButton');
        applyButton.disabled = schema === 'All';
        this.updateScheduleOutput();
        this.scheduleChanged = true;
    }

    updateScheduleOutput() {
        const schema = this.shadowRoot.getElementById('encodingSchema').value;
        let schedule;
        if (schema === 'JSON') {
            schedule = this.generateJSONSchedule();
        } else if (schema === 'Devi') {
            schedule = this.generateDeviSchedule();
        } else if (schema === 'Bitmask') {
            schedule = this.generateBitmaskSchedule();
        } else if (schema === 'All') {
            schedule = {
                JSON: this.generateJSONSchedule(),
                Devi: this.generateDeviSchedule(),
                Bitmask: this.generateBitmaskSchedule()
            };
        }
        this.shadowRoot.getElementById('scheduleOutput').value = JSON.stringify(schedule, null, 2);
    }

    showUpdateButton() {
        if (this.scheduleChanged) {
            const updateButton = this.shadowRoot.getElementById('updateButton');
            updateButton.style.display = 'block';
        }
    }

    generateJSONSchedule() {
        const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
        const table = this.shadowRoot.getElementById('schedule').getElementsByTagName('tbody')[0];
        const schedule = {};
        for (let i = 0; i < days.length; i++) {
            const row = table.rows[i];
            const day = days[i];
            schedule[day] = [];
            for (let j = 0; j < 24; j++) {
                const cell = row.cells[j + 1];
                const leftHalfHour = cell.querySelector('.half-hour:first-child');
                const rightHalfHour = cell.querySelector('.half-hour:last-child');
                if (leftHalfHour.classList.contains('selected')) {
                    schedule[day].push(`${j}:00`);
                }
                if (rightHalfHour.classList.contains('selected')) {
                    schedule[day].push(`${j}:30`);
                }
            }
        }
        return schedule;
    }

    generateDeviSchedule() {
        const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
        const table = this.shadowRoot.getElementById('schedule').getElementsByTagName('tbody')[0];
        const schedule = {};
        for (let i = 0; i < days.length; i++) {
            const row = table.rows[i];
            const day = days[i];
            schedule[day] = [];
            let intervals = [];
            for (let j = 0; j < 48; j++) {
                const hour = Math.floor(j / 2);
                const half = j % 2;
                const cell = row.cells[hour + 1];
                const halfHourDiv = cell.querySelector(`.half-hour:nth-child(${half + 1})`);
                if (halfHourDiv.classList.contains('selected')) {
                    intervals.push(j);
                }
            }
            if (intervals.length > 0) {
                let combinedIntervals = this.combineIntervals(intervals);
                for (let interval of combinedIntervals) {
                    const from = this.formatTime(Math.floor(interval[0] / 2), (interval[0] % 2) * 30);
                    const to = this.formatTime(Math.floor((interval[1] + 1) / 2), ((interval[1] + 1) % 2) * 30);
                    schedule[day].push(this.time_range_to_hex(`${from} - ${to}`));
                }
            }
        }
        return schedule;
    }

    combineIntervals(intervals) {
        let combined = [];
        let start = intervals[0];
        let end = intervals[0];
        for (let i = 1; i < intervals.length; i++) {
            if (intervals[i] <= end + 2) {
                end = intervals[i];
            } else {
                if (start !== end) { // Only push intervals that are not single elements
                    combined.push([start, end]);
                }
                start = intervals[i];
                end = intervals[i];
            }
        }

        if (start !== end) { // Only push the last interval if it is not a single element
            combined.push([start, end]);
        }

        return combined;
    }

    formatTime(hour, minute) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    generateBitmaskSchedule() {
        const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
        const table = this.shadowRoot.getElementById('schedule').getElementsByTagName('tbody')[0];
        const schedule = {};
        for (let i = 0; i < days.length; i++) {
            const row = table.rows[i];
            const day = days[i];
            let bitmask = 0n;
            for (let j = 0; j < 24; j++) {
                const cell = row.cells[j + 1];
                const leftHalfHour = cell.querySelector('.half-hour:first-child');
                const rightHalfHour = cell.querySelector('.half-hour:last-child');
                if (leftHalfHour.classList.contains('selected')) {
                    bitmask |= 1n << BigInt(j * 2);
                }
                if (rightHalfHour.classList.contains('selected')) {
                    bitmask |= 1n << BigInt(j * 2 + 1);
                }
            }
            schedule[day] = this.bitmask_to_hex(bitmask);
        }
        return schedule;
    }

    applySchedule() {
        const schema = this.shadowRoot.getElementById('encodingSchema').value;
        const schedule = JSON.parse(this.shadowRoot.getElementById('scheduleOutput').value);
        if (schema === 'JSON') {
            this.applyJSONSchedule(schedule);
        } else if (schema === 'Devi') {
            this.applyDeviSchedule(schedule);
        } else if (schema === 'Bitmask') {
            this.applyBitmaskSchedule(schedule);
        }
    }

    applyJSONSchedule(schedule) {
        const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
        const table = this.shadowRoot.getElementById('schedule').getElementsByTagName('tbody')[0];
        for (let i = 0; i < days.length; i++) {
            const row = table.rows[i];
            const day = days[i];
            for (let j = 0; j < 24; j++) {
                const cell = row.cells[j + 1];
                const hour = j;
                const leftHalfHour = `${hour}:00`;
                const rightHalfHour = `${hour}:30`;
                const leftHalfHourDiv = cell.querySelector('.half-hour:first-child');
                const rightHalfHourDiv = cell.querySelector('.half-hour:last-child');
                if (schedule[day].includes(leftHalfHour)) {
                    leftHalfHourDiv.classList.add('selected');
                } else {
                    leftHalfHourDiv.classList.remove('selected');
                }
                if (schedule[day].includes(rightHalfHour)) {
                    rightHalfHourDiv.classList.add('selected');
                } else {
                    rightHalfHourDiv.classList.remove('selected');
                }
            }
        }
    }

    applyDeviSchedule(schedule) {
        const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
        const table = this.shadowRoot.getElementById('schedule').getElementsByTagName('tbody')[0];
        for (let i = 0; i < days.length; i++) {
            const row = table.rows[i];
            const day = days[i];
            for (let j = 0; j < 24; j++) {
                const cell = row.cells[j + 1];
                const leftHalfHourDiv = cell.querySelector('.half-hour:first-child');
                const rightHalfHourDiv = cell.querySelector('.half-hour:last-child');
                leftHalfHourDiv.classList.remove('selected');
                rightHalfHourDiv.classList.remove('selected');
            }
            for (const hex of schedule[day]) {
                const timeRange = this.hex_to_time_range(hex);
                const [start, end] = timeRange.split(" - ");
                const startIndex = this.time_to_index(start);
                const endIndex = this.time_to_index(end);
                for (let j = startIndex; j < endIndex; j++) {
                    const cell = row.cells[Math.floor(j / 2) + 1];
                    const leftHalfHourDiv = cell.querySelector('.half-hour:first-child');
                    const rightHalfHourDiv = cell.querySelector('.half-hour:last-child');
                    if (j % 2 === 0) {
                        leftHalfHourDiv.classList.add('selected');
                    } else {
                        rightHalfHourDiv.classList.add('selected');
                    }
                }
            }
        }
    }

    applyBitmaskSchedule(schedule) {
        const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
        const table = this.shadowRoot.getElementById('schedule').getElementsByTagName('tbody')[0];
        for (let i = 0; i < days.length; i++) {
            const row = table.rows[i];
            const day = days[i];
            const bitmask = this.hex_to_bitmask(schedule[day]);
            for (let j = 0; j < 24; j++) {
                const cell = row.cells[j + 1];
                const leftHalfHourDiv = cell.querySelector('.half-hour:first-child');
                const rightHalfHourDiv = cell.querySelector('.half-hour:last-child');
                if (bitmask & (1n << BigInt(j * 2))) {
                    leftHalfHourDiv.classList.add('selected');
                } else {
                    leftHalfHourDiv.classList.remove('selected');
                }
                if (bitmask & (1n << BigInt(j * 2 + 1))) {
                    rightHalfHourDiv.classList.add('selected');
                } else {
                    rightHalfHourDiv.classList.remove('selected');
                }
            }
        }
    }

    updateSensorValue() {
        const schedule = this.shadowRoot.getElementById('scheduleOutput').value;
        const commandTopic = this._config.commandTopic;

        if (!commandTopic) {
            console.log('Command Topic:', schedule);
            return;
        }

        this._hass.callService('mqtt', 'publish', {
            topic: commandTopic,
            payload: schedule
        }).then(() => {
            this.scheduleChanged = false;
            this.shadowRoot.getElementById('updateButton').style.display = 'none';
        }).catch(err => {
            console.error('Failed to update sensor value:', err);
        });
    }

    time_range_to_hex(time_range) {
        function encode_part(time) {
            if (!time) return "";
            const [hours, minutes] = time.split(":").map(Number);
            if (hours < 16) {
                return minutes === 0 ? `8${hours.toString(16).toUpperCase()}` : `c${hours.toString(16).toUpperCase()}`;
            } else {
                const adjustedHours = hours - 16;
                return minutes === 0 ? `9${adjustedHours.toString(16).toUpperCase()}` : `d${adjustedHours.toString(16).toUpperCase()}`;
            }
        }

        const [from_time, to_time] = time_range.split(" - ");
        const from_hex = encode_part(from_time);
        const to_hex = encode_part(to_time);
        return from_hex + to_hex;
    }

    hex_to_time_range(hex_code) {
        function decode_part(hex_part) {
            const minutes = hex_part[0] === '8' || hex_part[0] === '9' ? "00" : "30";
            const hours = parseInt(hex_part[1], 16) + (hex_part[0] === '9' || hex_part[0] === 'd' ? 16 : 0);
            return `${hours.toString().padStart(2, '0')}:${minutes}`;
        }

        const from_part = hex_code.slice(0, 2);
        const to_part = hex_code.slice(2);
        const from_time = decode_part(from_part);
        const to_time = decode_part(to_part);
        return `${from_time} - ${to_time}`;
    }

    time_to_index(time_str) {
        const [hours, minutes] = time_str.split(":").map(Number);
        return hours * 2 + (minutes / 30);
    }

    encode_time_ranges(time_ranges) {
        let bitmask = 0n;
        for (const time_range of time_ranges) {
            const [start_time, end_time] = time_range.split(" - ");
            const start_index = this.time_to_index(start_time);
            const end_index = this.time_to_index(end_time);
            for (let i = start_index; i < end_index; i++) {
                bitmask |= 1n << BigInt(i);
            }
        }
        return bitmask;
    }

    decode_bitmask(bitmask) {
        const time_ranges = [];
        let i = 0;
        while (i < 48) {
            if (bitmask & (1n << BigInt(i))) {
                const start_index = i;
                while (i < 48 && (bitmask & (1n << BigInt(i)))) {
                    i++;
                }
                const end_index = i;
                const start_time = `${Math.floor(start_index / 2).toString().padStart(2, '0')}:${(start_index % 2) * 30 === 0 ? '00' : '30'}`;
                const end_time = end_index === 48 ? "00:00" : `${Math.floor(end_index / 2).toString().padStart(2, '0')}:${(end_index % 2) * 30 === 0 ? '00' : '30'}`;
                time_ranges.push(`${start_time} - ${end_time}`);
            } else {
                i++;
            }
        }
        return time_ranges;
    }

    bitmask_to_hex(bitmask) {
        return bitmask.toString(16).padStart(12, '0');
    }

    hex_to_bitmask(hex_str) {
        return BigInt('0x' + hex_str);
    }
}

// Define the custom element
customElements.define('weekly-schedule-card', WeeklyScheduleCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'weekly-schedule-card',
    name: 'Weekly Schedule Card',
    preview: false,
    description: 'Weekly Schedule'
});

