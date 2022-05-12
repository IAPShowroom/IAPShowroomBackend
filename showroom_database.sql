CREATE TABLE Users(userid serial primary key, first_name varchar(60), last_name varchar(60), email varchar(60), password varchar(60), user_role varchar(30), gender text, verifiedemail boolean);

CREATE TABLE Admins(adminid serial primary key, userid integer references Users(userid));

CREATE TABLE Student_Researchers(studentid serial primary key, userid integer references Users(userid), department text, grad_date text, isPM boolean, validatedmember boolean);

CREATE TABLE Company_Representatives(representativeid serial primary key, userid integer references Users(userid), company_name text);

CREATE TABLE Advisors(advisorid serial primary key, userid integer references Users(userid), validatedmember boolean);

CREATE TABLE Projects(projectid serial primary key, IAPprojectid int, IAPsessionid int, IAPproject_title text, IAPproject_abstract text, isLatest boolean);

CREATE TABLE IAP_Events(meetid serial primary key, adminid integer references Admins(adminid), projectid integer references Projects(projectid), startTime timestamp, duration integer, title text, e_date timestamp, isdeleted boolean);

CREATE TABLE MeetHistory(meethistoryid serial primary key, projectid integer references Projects(projectid), userid integer references Users(userid), jointime timestamp);

CREATE TABLE Announcements(announcementid serial primary key, adminid integer references Admins(adminid), a_content text, a_date timestamp);

CREATE TABLE participates(userid integer references Users(userid), projectid integer references Projects(projectid), primary key(userid, projectid));

CREATE TABLE EmailUUID(emailid serial primary key, userid integer references Users(userid), eUUID text, expiration timestamp);

CREATE TABLE InPerson_Users(uID serial primary key, first_name varchar(60), last_name varchar(60), email varchar(60), gender text, user_role varchar(30), major text, grad_date text, department text, company_name text);

-- Needs to update in production
CREATE TABLE Conference(cID serial primary key, c_text text, c_date date, isDeleted boolean);
ALTER TABLE iap_events ADD COLUMN cID INT;
ALTER TABLE iap_events ADD FOREIGN KEY (cID) REFERENCES Conference(cID);
ALTER TABLE inperson_users ADD COLUMN live_date DATE;
ALTER TABLE EmailUUID ADD COLUMN type text;

-- Commands to drop project id fkey constraints in order to use IAP project ids
ALTER TABLE meethistory DROP CONSTRAINT meethistory_projectid_fkey;
ALTER TABLE participates DROP CONSTRAINT participates_projectid_fkey;
ALTER TABLE iap_events DROP CONSTRAINT iap_events_projectid_fkey;