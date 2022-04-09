/**
 * File to centralize testing data.
 */

//Test data:

const adminUser = {
    first_name: 'TestUser',
    last_name: 'TestUserini',
    email: 'test123@gmail.com',
    password: 'testpassword',
    gender: 'male',
    user_role: 'test_role'
}

const normalUser = {
    first_name: 'TestUserNoAdmin',
    last_name: 'TestUserini',
    email: 'test567@gmail.com',
    password: 'testpassword',
    gender: 'male',
    user_role: 'test_role'
}

const notInDBUser = {
    first_name: 'TestUserNotInDB',
    last_name: 'TestUserini',
    email: 'notindbtest567@gmail.com',
    password: 'testpasswordz',
    gender: 'male',
    user_role: 'test_role'
}

const exEvent = {
    adminid: 1,
    startTime: '11:00 AM',
    duration: 20,
    title: 'Carro Solar 2022',
    projectid: 4,
    e_date: '04-25-22'
}

const exEventUpdateDate = {
    adminid: 1,
    startTime: '12:00 PM',
    duration: 20,
    title: 'Carro Solar 2022',
    projectid: 4,
    e_date: '04-26-22'
}

const exEvent2 = {
    adminid: 1,
    startTime: '11:30 AM',
    duration: 20,
    title: 'BCI SSVEP',
    projectid: 5,
    e_date: '04-25-22'
}

const exEvent3 = {
    adminid: 1,
    startTime: '12:00 PM',
    duration: 20,
    title: 'Embedded',
    projectid: 6,
    e_date: '04-25-22'
}

const exEvent4 = {
    adminid: 1,
    startTime: '12:30 PM',
    duration: 20,
    title: 'Pandahat',
    projectid: 7,
    e_date: '04-25-22'
}

const exEventList = [exEvent2, exEvent3, exEvent4];

const getMeetingInfoXMLSuccessResponse = "<response><returncode>SUCCESS</returncode><running>true</running></response>";

module.exports = {
    exEvent: exEvent,
    exEvent2: exEvent2,
    exEvent3: exEvent3,
    exEvent4: exEvent4,
    exEventList: exEventList,
    exEventUpdateDate: exEventUpdateDate,
    adminUser: adminUser,
    normalUser: normalUser,
    notInDBUser: notInDBUser,
    getMeetingInfoXMLSuccessResponse: getMeetingInfoXMLSuccessResponse
}