const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;
const path = require("path");
const session = require("express-session");

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'UniversityManagement',
    password: "157056724",
    port: 5432,
  });

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use('/media', express.static(path.join(__dirname, "views", "media"))); // Serve the media folder (for the logo)
app.set("view engine", "ejs"); // Set the view engine to EJS

app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true
}));

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Error logging out");
        }
        res.redirect('/'); // Redirect to the home page or login page after logout
    });
});


function checkUserLogout(req, res, next) {
    if (req.session.student_id) {
        return res.redirect('/student_details');
    } else if (req.session.faculty_id) {
        return res.redirect('/faculty_details');
    } else if (req.session.admin_id) {
        return res.redirect('/admin_details');
    }
    next(); // Allow access if no one is logged in
}


function checkStudentLogin(req, res, next) {
    if (req.session.student_id) {
        return next(); // Allow access to the route
    }
    res.redirect('/student_login'); // Redirect to the student login page if not logged in
}

// Middleware to check if the faculty is logged in
function checkFacultyLogin(req, res, next) {
    if (req.session.faculty_id) {
        return next(); // Allow access to the route
    }
    res.redirect('/faculty_login'); // Redirect to the faculty login page if not logged in
}

// Middleware to check if the admin is logged in
function checkAdminLogin(req, res, next) {
    if (req.session.admin_id) { // Check for faculty session
        return next(); // Allow access to the route
    }
    res.redirect('/admin_login'); // Redirect to the admin login page if not logged in
}
// Define routes
app.get('/', checkUserLogout, (req, res) => {
    res.render('index.ejs');
});

app.post('/student_login', async (req, res) => {
    const { username, email, registration } = req.body;
    console.log(username, email, registration);
    try {
        const result = await pool.query(
            'SELECT * FROM student WHERE name = $1 AND email = $2 AND registration_number = $3',
            [username, email, registration]
        );

        if (result.rows.length > 0) {
            req.session.student_id = result.rows[0].student_id;
            res.redirect('/student_details');
        } else {
            res.send("Your Login Credentials aren't updated in our database at the moment. We will do the needful in some time......");
        }
    } catch (err) {
        console.error(err);
        res.send("Database error");
    }
});


app.post('/faculty_login', async (req, res) => {
    const { username, email, registration } = req.body;
    console.log(username, email, registration);
    try {
        const result = await pool.query(
            'SELECT * FROM faculty WHERE name = $1 AND email = $2 AND registration_number = $3',
            [username, email, registration]
        );

        if (result.rows.length > 0) {
            req.session.faculty_id = result.rows[0].faculty_id;
            res.redirect('/faculty_details');
        } else {
            res.send("Your Login Credentials aren't updated in our database at the moment. We will do the needful in some time......");
        }
    } catch (err) {
        console.error(err);
        res.send("Database error");
    }
});


app.post('/admin_login', async (req, res) => {
    const { username, email, secretkey } = req.body;
    console.log(username, email, secretkey);
    try {
        if(username === "Admin" && email === "admin@srmist.edu.in" && secretkey === "123456"){
            req.session.admin_id = 123456;
            res.render('admin_detail.ejs');
        }
    } catch (err) {
        console.error(err);
        res.send("Database error");
    }
});

app.get('/student_login', (req, res) => {
    res.render('student_login.ejs');
});

app.get('/faculty_login', (req, res) => {
    res.render('faculty_login.ejs');
});

app.get('/admin_login', (req, res) => {
    res.render('admin_login.ejs');
});

app.get('/faculty_details/finance_updates', checkFacultyLogin,  async (req, res) => {
    
    const facultyId = req.session.faculty_id;

    if(!facultyId){
        return res.redirect('/faculty_login');
    }

    try{
        const data = await pool.query('SELECT * FROM employee_payments WHERE faculty_id = $1', [facultyId]);
        const result = data.rows;
        res.render('finance_updates.ejs', {result});
    }
    catch(error){
        console.error(error);
    }
});

app.get('/faculty_details/courses_handled', checkFacultyLogin,  async (req, res) => {

    let faculty_id = req.session.faculty_id;

    try{
        const data = await pool.query("SELECT * FROM faculty_subjects AS f JOIN subjects AS s USING(coursecode) WHERE f.faculty_id = $1", [faculty_id]);
        const result = data.rows;
        res.render('courses_handled.ejs', {result});
    }
    catch(error){
        console.error(error);
    }
    
});

app.get('/faculty_details', checkFacultyLogin,  async (req, res) => {

    let faculty_id = req.session.faculty_id;
    try{
        let enroll = await pool.query("SELECT * FROM faculty_students_enrolled WHERE faculty_id = $1", [faculty_id]);
        let research_papers = await pool.query("SELECT * FROM faculty_research_papers WHERE faculty_id = $1", [faculty_id]);
        let activities = await pool.query("SELECT * FROM faculty_recent_activities WHERE faculty_id = $1", [faculty_id]);
        let numcourses = await pool.query("SELECT COUNT(coursecode) FROM faculty_subjects GROUP BY faculty_id HAVING faculty_id = $1", [faculty_id]);
        let data = {
            enroll: enroll.rows[0],
            research_papers: research_papers.rows[0],
            activities: activities.rows,
            numcourses: numcourses.rows[0]
        };

        console.log(enroll.rows[0],research_papers.rows[0],activities.rows,numcourses.rows[0]);
        res.render('faculty_detail.ejs', {data});
    }
    catch(error){
        console.error(error);
    }
    
});

app.get('/faculty_details/faculty_achievements', checkFacultyLogin, async (req, res) => {

    let faculty_id = req.session.faculty_id;
    try{
        let degree = await pool.query("SELECT * FROM faculty_degrees WHERE faculty_id = $1", [faculty_id]);
        let achievements = await pool.query("SELECT * FROM faculty_achievements WHERE faculty_id = $1", [faculty_id]);
        let projects = await pool.query("SELECT * FROM faculty_projects WHERE faculty_id = $1", [faculty_id]);
        let certifications = await pool.query("SELECT * FROM faculty_certifications WHERE faculty_id = $1", [faculty_id]);
        let skills = await pool.query("SELECT * FROM faculty_skills WHERE faculty_id = $1", [faculty_id]);
        let activities = await pool.query("SELECT * FROM faculty_activities WHERE faculty_id = $1", [faculty_id]);

        let result = {
            degree: degree.rows,
            achievements: achievements.rows,
            projects:  projects.rows,
            certifications: certifications.rows,
            skills: skills.rows,
            activities: activities.rows
        };

        res.render('faculty_achievements.ejs', {result});

    }
    catch(error){
        console.error(error);
    }
    
});

app.get('/student_details', checkStudentLogin, async (req, res) => {

    const studentId = req.session.student_id;

    if (!studentId) {
        return res.redirect('/student_login');
    }

    try {
        const student = await pool.query('SELECT * FROM student WHERE student_id = $1', [studentId]);
        const profile = await pool.query('SELECT * FROM student_profile WHERE student_id = $1', [studentId]);
        const background = await pool.query('SELECT * FROM student_background WHERE student_id = $1', [studentId]);
        const father = await pool.query('SELECT * FROM father_details WHERE student_id = $1', [studentId]);
        const mother = await pool.query('SELECT * FROM mother_details WHERE student_id = $1', [studentId]);

        const data = {
            student: student.rows[0],
            profile: profile.rows[0],
            background: background.rows[0],
            father: father.rows[0],
            mother: mother.rows[0]
        };

        res.render('student_detail.EJS', { data });
    } catch (err) {
        console.error(err);
    }
});

app.get('/student_details/attendance', checkStudentLogin,  async (req, res) => {

    const studentId = req.session.student_id;

    if (!studentId) {
        return res.redirect('/student_login');
    }

    try {
        const attendance = await pool.query('SELECT * FROM attendance WHERE student_id = $1', [studentId]);
        const data = {
            attendance: attendance.rows
        };

        res.render('attendance.ejs', { data });
    } catch (err) {
        console.error(err);
    }

});

app.get('/student_details/academia', checkStudentLogin, async (req, res) => {

    let studentId = req.session.student_id;

    if (!studentId) {
        return res.redirect('/student_login');
    }

    try {
        const academia = await pool.query('SELECT * FROM academia WHERE student_id = $1', [studentId]);
        const subjectMarks = {
            OPS101: academia.rows[0].ops101,
            MAT102: academia.rows[0].mat102,
            DSA103: academia.rows[0].dsa103,
            DDA104: academia.rows[0].dda104,
            AIN105: academia.rows[0].ain105,
            COA106: academia.rows[0].coa106,
            DBM107: academia.rows[0].dbm107,
            JAV108: academia.rows[0].jav108,
            PYP109: academia.rows[0].pyp109
        };

        let result = await pool.query('SELECT * FROM academic_calendar');
        result = result.rows;

        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Organize data per month
        let calendarData = {};

        // Initialize month keys
        months.forEach(month => {
            calendarData[month] = [];
        });

        result.forEach(row => {
            const day = row.day_status.padStart(2, '0'); // format day like "01", "02", etc.
            months.forEach(month => {
                const value = row[month.toLowerCase()];
                if (value !== null) {
                    calendarData[month].push(`${month.slice(0, 3)} ${day}: ${value}`);
                }
            });
        });

        const result1 = await pool.query('SELECT * FROM Timetable ORDER BY day_order, hour_order');

            let groupedData = {};

            result1.rows.forEach(row => {
            const day = row.day_order;

            if (!groupedData[day]) {
                groupedData[day] = {
                block1: [], // 9–11am
                block2: [], // 11–1pm
                block3: []  // 2–4pm
                };
            }

            const hour = row.hour_order;
            const subj = row.subject_code;

            if ([3, 4].includes(hour)) groupedData[day].block1.push(subj);
            else if ([5, 6, 7].includes(hour)) groupedData[day].block2.push(subj);
            else if ([8, 9, 10].includes(hour)) groupedData[day].block3.push(subj);
            });


            const data = {
                academia: academia.rows[0],
                subjectMarks,
                calendarData,
                groupedData
            };




        res.render('academia.ejs', { data });
    } catch (err) {
        console.error(err);
    }

});

app.get('/student_details/student_course_feedback', checkStudentLogin, (req, res) => {
    res.render('student_course_feedback.ejs');
});

app.post('/student_details/student_course_feedback', checkStudentLogin, async (req, res) => {
    let studentId = req.session.student_id;
    const {subject_code, subject_name,subject_feedback, hostel_name, hostel_feedback, infra_feedback,mess_name, mess_feedback, faculty_id, faculty_name, faculty_feedback, ambience_feedback } = req.body;

    try{
        let result = await pool.query(`INSERT INTO feedback
             (student_id, faculty_id, faculty_name, faculty_feedback, hostel_name, hostel_feedback, 
             subject_code, subject_name, subject_feedback, mess_name, mess_feedback, 
             infrastructure_feedback, overall_ambience_feedback) VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,$13)`,
              [ studentId, faculty_id, faculty_name, faculty_feedback, hostel_name, hostel_feedback,  subject_code, subject_name,subject_feedback,  mess_name, mess_feedback, infra_feedback,  ambience_feedback] );
        
        res.render('student_course_feedback.ejs');
            
    }
    catch(err){
        console.error(err);
    }
});

app.get('/admin_details', checkAdminLogin, (req, res) => {
    res.render('admin_detail.ejs');
});

app.get('/admin_details/vigilance', checkAdminLogin, async (req, res) => {
    try{
        let result = await pool.query("SELECT * FROM university_vigilance");
        let data = {
            result: result.rows
        };
        res.render('vigilance.ejs', {data});
    }
    catch(error){
        console.error(error);
    }
    
});

app.get('/admin_details/detention_list', checkAdminLogin, async (req, res) => {
    try{
        let result = await pool.query(`
            SELECT 
              s.student_id, sp.age, sp.dob, sp.blood_group, sp.phone_number, sp.gender, 
              s.name, s.department_id, s.email, s.registration_number,
              sdl.detention_duration_months
            FROM student_detention_list AS sdl
            JOIN student_profile AS sp ON sdl.student_id = sp.student_id
            JOIN student AS s ON sdl.student_id = s.student_id;
          `);
        let data = {
            result: result.rows
        };
        res.render('detention_list.ejs', {data});
    }
    catch(error){
        console.error(error);
    }
    
});

app.get('/admin_details/infrastructure_details', checkAdminLogin, async (req, res) => {
    try{
        let park = await pool.query("SELECT * FROM overall_feedbacks WHERE facility_type = 'Parks' ");
        let hospitals = await pool.query("SELECT * FROM overall_feedbacks WHERE facility_type = 'Hospitals' ");
        let academic = await pool.query("SELECT * FROM overall_feedbacks WHERE facility_type = 'Academic Blocks' ");
        let gardens = await pool.query("SELECT * FROM overall_feedbacks WHERE facility_type = 'Gardens' ");
        let roads = await pool.query("SELECT * FROM overall_feedbacks WHERE facility_type = 'Roads & Footpaths' ");
        let playground = await pool.query("SELECT * FROM overall_feedbacks WHERE facility_type = 'Playgrounds & Indoor Games' ");
        let data = {
            park : park.rows[0],
            hospitals : hospitals.rows[0],
            academic : academic.rows[0],
            gardens : gardens.rows[0],
            roads :roads.rows[0],
            playground: playground.rows[0]
        };
        res.render('infrastructure.ejs', {data});
    }
    catch(error){
        console.error(error);
    }
});

app.get('/admin_details/mess_details', checkAdminLogin, async (req, res) => {

    const hostels = [
        'kalpana_chawla', 'm_block', 'meenakshi', 'began',
        'oori', 'paari', 'kaari', 'malligai', 'thamarai', 'nelson_mandela',
        'aadhiyaman', 'agasthiyar', 'sannasi', 'mullai',
        'manoranjitham', 'avayyiar', 'krs'
      ];
    
      let hostelData = {};
 
    try{
        let boys_hostels = await pool.query("SELECT * FROM hostels WHERE gender = 'Male';");
        let girls_hostels = await pool.query("SELECT * FROM hostels WHERE gender = 'Female';");

        for (let hostel of hostels) {
            let complaints = await pool.query(`SELECT * FROM ${hostel}_complaints`);
            let messComplaints = await pool.query(`SELECT * FROM ${hostel}_mess_complaints`);
            let messMenu = await pool.query(`SELECT * FROM ${hostel}_mess_menu`);
      
            hostelData[hostel] = {
              complaints: complaints.rows,
              messComplaints: messComplaints.rows,
              messMenu: messMenu.rows
            };
        }

        console.log(hostelData);
        
        let data = {
            boys: boys_hostels.rows,
            girls: girls_hostels.rows,
            hostel_data: hostelData
        };

        res.render('mess.ejs', {data});

    }
    catch(error){
        console.error(error);
    }
    
});

// app.get('/admin_details/hostel_details', (req, res) => {
//     res.render('hostel.ejs');
// });

app.get('/admin_details/library', checkAdminLogin, async (req, res) => {
    try {
        let os = await pool.query("SELECT * FROM operating_system");
        let coa = await pool.query("SELECT * FROM computer_system_and_organization");
        let daa = await pool.query("SELECT * FROM daa");
        let dsa = await pool.query("SELECT * FROM dsa");
        let dbms = await pool.query("SELECT * FROM dbms");
        let ai = await pool.query("SELECT * FROM artificial_intelligence_and_machine_learning");
        let ann = await pool.query("SELECT * FROM ann");
        let cnn = await pool.query("SELECT * FROM cnn");
        let rnn = await pool.query("SELECT * FROM rnn");
        let cd = await pool.query("SELECT * FROM compiler_design");
        let oops = await pool.query("SELECT * FROM oops");
        let java = await pool.query("SELECT * FROM java");
        let python = await pool.query("SELECT * FROM python");
        let c = await pool.query("SELECT * FROM c");
        let cpp = await pool.query("SELECT * FROM cpp");

        let data = {
            os: os.rows,
            coa: coa.rows,
            daa: daa.rows,
            dsa: dsa.rows,
            ai: ai.rows,
            ann: ann.rows,
            cnn: cnn.rows,
            rnn: rnn.rows,
            cd: cd.rows,
            oops: oops.rows,
            java: java.rows,
            python: python.rows,
            c: c.rows,
            cpp: cpp.rows,
            dbms: dbms.rows
        };

        let dict = {
            "Operating Systems" : "os",
            "Data Structure and Algorithms": "dsa",
            "Design and Analysis of Algorithms": "daa",
            "Database Management Systems": "dbms",
            "Compiler Design": "cd",
            "Object Oriented Programming": "oops",
            "Artificial Intelligence": "ai",
            "Computer Organization and Architecture": "coa",
            "Recurrent Neural Networks": "rnn",
            "Artificial Neural Networks": "ann",
            "Convolutional Neural Networks": "cnn",
            "Java": "java",
            "Python": "python",
            "C": "c",
            "C++": "cpp"
        }

        res.render('library.ejs', { data , dict});
        // res.send(data);
    } catch (error) {
        // console.error("Error occurred while fetching data:", error);  // Log the error
        // res.status(500).send("Internal Server Error");  // Return a 500 error message
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
