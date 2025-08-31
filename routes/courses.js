const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/CourseController');
const { jwtVerify } = require('../middleware/auth');
const { roleProtect } = require('../middleware/roleProtect');

router.get('/', jwtVerify, CourseController.listCourses);
router.get('/:id', jwtVerify, CourseController.getCourseDetails);
router.get('/:courseId/progress', jwtVerify, roleProtect('Student'), CourseController.getStudentProgress);
router.post('/enroll', jwtVerify, roleProtect('Student'), CourseController.enrollInCourse);
router.post('/complete-checkpoint', jwtVerify, roleProtect('Student'), CourseController.completeCheckpoint);
router.post('/', jwtVerify, roleProtect('Recruiter'), CourseController.createCourse);
router.delete('/:id', jwtVerify, roleProtect('Admin'), CourseController.deleteCourse);

module.exports = router;


