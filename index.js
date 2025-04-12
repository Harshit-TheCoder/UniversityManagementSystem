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
// Define routes
app.get('/', (req, res) => {
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
    const { username, email, registration } = req.body;
    console.log(username, email, registration);
    try {
        const result = await pool.query(
            'SELECT * FROM student WHERE name = $1 AND email = $2 AND registration_number = $3',
            [username, email, registration]
        );

        if (result.rows.length > 0) {
            res.redirect('/student_details');
        } else {
            res.send("Your Login Credentials aren't updated in our database at the moment. We will do the needful in some time......");
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

app.get('/student_details', async (req, res) => {

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

app.get('/student_details/attendance', async (req, res) => {

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

app.get('/student_details/academia', async (req, res) => {

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

app.get('/student_details/student_course_feedback', (req, res) => {
    res.render('student_course_feedback.ejs');
});

app.post('/student_details/student_course_feedback', async (req, res) => {
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

app.get('/faculty_details', (req, res) => {
    res.render('faculty_detail.ejs');
});

app.get('/faculty_details/faculty_achievements', (req, res) => {
    res.render('faculty_achievements.ejs');
});

app.get('/faculty_details/courses_handled', (req, res) => {
    res.render('courses_handled.ejs');
});

app.get('/faculty_details/finance_updates', (req, res) => {
    res.render('finance_updates.ejs');
});

app.get('/admin_details', (req, res) => {
    res.render('admin_detail.ejs');
});

app.get('/admin_details/vigilance', (req, res) => {
    res.render('vigilance.ejs');
});

app.get('/admin_details/detention_list', (req, res) => {
    res.render('detention_list.ejs');
});

app.get('/admin_details/mess_details', (req, res) => {
    res.render('mess.ejs');
});

app.get('/admin_details/hostel_details', (req, res) => {
    res.render('hostel.ejs');
});

app.get('/admin_details/complaint_log', (req, res) => {
    res.render('complaint.ejs');
});

app.get('/admin_details/infrastructure_details', (req, res) => {
    res.render('infrastructure.ejs');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
