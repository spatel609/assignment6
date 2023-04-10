var HTTP_PORT = process.env.PORT || 8082;
var express = require("express");
var exphbs = require("express-handlebars")
var app = express();
const cd = require('./modules/collegedata.js');

app.use(express.static('public'))

app.use(express.urlencoded({ extended: true }));

app.set('views', './views');

app.engine('hbs', exphbs.engine({
    extname: '.hbs',
    layoutsDir: __dirname + "/views/layouts/",
    defaultLayout: 'main',
    helpers: {
      navLink: function(url, options) {
        return '<li' +
          ((url == app.locals.activeRoute) ? ' class="nav-item active"' : ' class="nav-item"') +
          '><a class="nav-link" href="' + url + '">' + options.fn(this) + '</a></li>';
      },

      equal: function (lvalue, rvalue, options) {
        if (arguments.length < 3)
            throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue != rvalue) {
            return options.inverse(this);
        } else {
            return options.fn(this);
        }
    }
    
    }
  }));
app.set("view engine", ".hbs");


//express route 
app.use(function(req,res,next){
    let route = req.path.substring(1);
    app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));    
    next();
});

// setup a 'route' to listen on the default url path
app.get("/", (req, res) => {
    res.render("home")
});

app.get("/about", (req, res) => {
    res.render("about")
});
app.get("/users", (req, res) => {
    res.sendFile(__dirname + '/views/users.html');
});


app.post('/students/add',  (req, res) => {
    cd.addStudents(req.body).then(studentData => {
        res.redirect('/students');
      });
  });

app.get("/htmlDemo", (req, res) => {
    res.render('htmlDemo')
});
app.get("/students",(req,res)=>{
  cd.getAllStudents()
  .then((data) => {
    if (data.length > 0) {
      res.render("students", { students: data });
    } else {
      res.render("students", { message: "no results" });
    }
  })
  .catch((error) => {
    res.render("students", { message: error.message });
  });
});



app.get("/courses", (req, res) => {
  cd.getCOurses()
    .then((data) => {
      if (data.length > 0) {
        res.render("courses", { courses: data });
      } else {
        res.render("courses", { message: "no results" });
      }
    })
    .catch((error) => {
      res.render("courses", { message: error.message });
    });
});


app.get("/student/:studentNum", (req, res) => {
  // initialize an empty object to store the values
  let viewData = {};

  cd.getStudentByNum(req.params.studentNum).then((data) => {
      if (data) {
          viewData.student = data; //store student data in the "viewData" object as "student"
      } else {
          viewData.student = null; // set student to null if none were returned
      }
  }).catch(() => {
      viewData.student = null; // set student to null if there was an error 
  })
  .then(() => {
    cd.getCOurses()
    .then((data) => {
      if (data) {
        viewData.courses = data; 
    } else {

        viewData.courses = null; 
    }

      // loop through viewData.courses and once we have found the courseId that matches
      // the student's "course" value, add a "selected" property to the matching 
      // viewData.courses object

      for (let i = 0; i < viewData.courses.length; i++) {
          if (viewData.courses[i].courseId == viewData.student.courseId) {
              viewData.courses[i].selected = true;
          }
      }})

  }).catch(() => {
    console.log("eeror vayo")
      viewData.courses = []; // set courses to empty if there was an error
  }).then(() => {
      if (viewData.student == null) { // if no student - return an error
          res.status(404).send("Student Not Found");
      } else {
          res.render("student", { viewData: viewData }); // render the "student" view
      }
  });
});


app.get('/course/:id', function(req, res) {
  // Get the course ID from the request parameters
  var courseId = req.params.id;
  
  // Call the getCourseById function to retrieve the course data
  cd.getCourseById(courseId)
    .then(function(course) {
      // If the course data is undefined, send a 404 error
      if (course === undefined) {
        res.status(404).send("Course Not Found");
      }
      else {
        res.render("course", { course: course });
      }
    })
    .catch(function(error) {
      // If there was an error, render the error view with the error message
      res.render('course', { message: error.message });
    });
});

app.post("/student/update", (req, res) => {
  cd.updateStudent(req.body)
    .then(() => {
      res.redirect("/students");
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error updating student");
    });
});
app.get('/courses/add', (req, res) => {
  // Render the "addCourse" view
  res.render('addCourse');
});

app.post('/courses/add', async (req, res) => {
  try {
    // Call the addCourse function with the POST data
    cd.addCourse(req.body);

    // Redirect to "/courses" when the promise has resolved
    res.redirect('/courses');
  } catch (error) {
    // Handle any errors that occur
    console.error(error);
    res.status(500).send('An error occurred while adding the course.');
  }
});

app.post('/course/update', async (req, res) => {
  try {
    // Call the updateCourse function with the POST data
    cd.updateCourse(req.body);

    // Redirect to "/courses" when the promise has resolved
    res.redirect('/courses');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while updating the course.');
  }
});

app.get('/course/delete/:id', function(req, res) {
  var courseId = req.params.id;
  
  cd.deleteCourseById(courseId)
    .then(function() {
      res.redirect('/courses');
    })
    .catch(function(error) {
      res.status(500).send("Unable to Remove Course / Course not found");
    });
});

app.get('/student/delete/:studentNum', (req, res) => {
  const studentNum = req.params.studentNum;
  cd.deleteStudentByNum(studentNum)
    .then(() => {
      res.redirect('/students');
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Unable to Remove Student / Student not found');
    });
});

app.get("/students/add", function(req, res) {
  cd.getCOurses()
    .then(function(data) {
      res.render("addStudent", {courses: data});
    })
    .catch(function(err) {
      console.log(err);
      res.render("addStudent", {courses: []});
    });
});

app.get('*', function(req, res){
    res.status(404).send('PAGE NOT FOUND!!!!');
  });
// setup http server to listen on HTTP_PORT
app.listen(HTTP_PORT, ()=>{console.log("server listening on port: " + HTTP_PORT)
cd.initialize()
});

