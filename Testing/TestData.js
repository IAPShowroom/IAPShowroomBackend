/**
 * File to centralize testing data.
 */

//Test data:
const exEvent = {
    adminid: 1,
    startTime: '8:00 AM',
    duration: '20',
    title: 'RUM Solar 2022',
    projectid: 1,
    e_date: '04-25-22'
}

const exEvent2 = {
    adminid: 1,
    startTime: '9:30 AM',
    duration: '20',
    title: 'Lidron',
    projectid: 2,
    e_date: '04-25-22'
}

const exEvent3 = {
    adminid: 1,
    startTime: '10:00 AM',
    duration: '20',
    title: 'Arecibo Observatory Drone',
    projectid: 3,
    e_date: '04-25-22'
}

const exEvent4 = {
    adminid: 1,
    startTime: '10:30 AM',
    duration: '20',
    title: 'BCI SSVEP',
    projectid: 4,
    e_date: '04-25-22'
}

const exEventList = [exEvent, exEvent2];

module.exports = {
    exEvent: exEvent,
    exEvent2: exEvent2,
    exEvent3: exEvent3,
    exEvent4: exEvent4,
    exEventList: exEventList
}