CREATE TABLE Users(userid serial primary key, first_name varchar(60), last_name varchar(60), email varchar(60), password varchar(60), user_role varchar(30), gender text, verifiedemail boolean);

CREATE TABLE Admins(adminid serial primary key, userid integer references Users(userid));

CREATE TABLE Student_Researchers(studentid serial primary key, userid integer references Users(userid), team_project text, department text, grad_date text, isPM boolean, validatedmember boolean);

CREATE TABLE Company_Representatives(representativeid serial primary key, userid integer references Users(userid), company_name text);

CREATE TABLE Advisors(advisorid serial primary key, userid integer references Users(userid), team_project text);

CREATE TABLE IAP_Events(eventid serial primary key, adminid integer references Admin(adminid), startTime time, duration time, title text, projectid integer, e_date timestamp);

CREATE TABLE MeetHistory(meethistoryid serial primary key, eventid integer references IAP_Events(eventid), userid integer references Users(userid), title text, jointime timestamp);

CREATE TABLE Announcements(announcementid serial primary key, userid integer references Users(userid), a_content text, a_date timestamp);