const Course = require('../models/Course');

class CourseController {
    static async enrollInCourse(req, res) {
        try {
            const { courseId } = req.body;
            if (!courseId) return res.status(400).json({ success: false, message: 'courseId is required' });
            const course = await Course.findById(courseId);
            if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

            // Check if already enrolled
            const existingEnrollment = course.enrollments.find(e => e.student.toString() === req.user.id);
            if (existingEnrollment) {
                return res.json({ success: true, message: 'Already enrolled', data: { course } });
            }

            // Add to studentsEnrolled array (for backward compatibility)
            if (!course.studentsEnrolled.some(id => id.toString() === req.user.id)) {
                course.studentsEnrolled.push(req.user.id);
            }

            // Add detailed enrollment record
            course.enrollments.push({
                student: req.user.id,
                enrolledAt: new Date(),
                completedCheckpoints: [],
                isExpired: false
            });

            await course.save();
            return res.json({ success: true, message: 'Enrolled successfully', data: { course } });
        } catch (error) {
            console.error('Enroll course error:', error);
            return res.status(500).json({ success: false, message: 'Failed to enroll' });
        }
    }

    static async getCourseDetails(req, res) {
        try {
            const { id } = req.params;
            const course = await Course.findById(id).populate('postedBy', 'name email role');
            if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
            
            const enrolled = course.studentsEnrolled.some(cid => cid.toString() === req.user.id);
            const enrollment = course.enrollments.find(e => e.student.toString() === req.user.id);
            
            // Check for expired enrollments (6 months from enrollment date)
            if (enrollment && !enrollment.isExpired) {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                
                if (enrollment.enrolledAt < sixMonthsAgo) {
                    enrollment.isExpired = true;
                    await course.save();
                }
            }

            return res.json({ 
                success: true, 
                data: { 
                    course, 
                    enrolled,
                    enrollment: enrollment || null,
                    studentCount: course.studentsEnrolled.length
                } 
            });
        } catch (error) {
            console.error('Get course details error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch course details' });
        }
    }

    static async listCourses(req, res) {
        try {
            const { recruiterOnly } = req.query;
            const baseQuery = {};
            if (recruiterOnly === 'true') {
                baseQuery.postedBy = { $ne: null };
            }
            let query = Course.find(baseQuery).populate('postedBy', 'name email role').sort({ createdAt: -1 });
            let courses = await query.exec();
            if (recruiterOnly === 'true') {
                courses = courses.filter(c => c.postedBy && c.postedBy.role === 'Recruiter');
            }
            
            // Add student count for each course
            courses = courses.map(course => ({
                ...course.toObject(),
                studentCount: course.studentsEnrolled.length
            }));
            
            return res.json({ success: true, data: { courses } });
        } catch (error) {
            console.error('List courses error:', error);
            return res.status(500).json({ success: false, message: 'Failed to list courses' });
        }
    }

    static async createCourse(req, res) {
        try {
            const { courseName, duration, description, banner, videoUrl, checkpoints } = req.body;
            if (!courseName) return res.status(400).json({ success: false, message: 'courseName is required' });
            
            // Process checkpoints if provided
            let processedCheckpoints = [];
            if (checkpoints && Array.isArray(checkpoints)) {
                processedCheckpoints = checkpoints.map((checkpoint, index) => ({
                    name: checkpoint.name,
                    description: checkpoint.description || '',
                    order: checkpoint.order || index + 1
                }));
            }

            const course = await Course.create({ 
                courseName, 
                duration: duration || '6 months', 
                description: description || '', 
                banner: banner || '', 
                videoUrl: videoUrl || '', 
                postedBy: req.user.id,
                checkpoints: processedCheckpoints
            });
            return res.status(201).json({ success: true, data: { course } });
        } catch (error) {
            console.error('Create course error:', error);
            return res.status(500).json({ success: false, message: 'Failed to create course' });
        }
    }

    static async completeCheckpoint(req, res) {
        try {
            const { courseId, checkpointId } = req.body;
            if (!courseId || !checkpointId) {
                return res.status(400).json({ success: false, message: 'courseId and checkpointId are required' });
            }

            const course = await Course.findById(courseId);
            if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

            // Find enrollment
            const enrollment = course.enrollments.find(e => e.student.toString() === req.user.id);
            if (!enrollment) {
                return res.status(400).json({ success: false, message: 'Not enrolled in this course' });
            }

            // Check if checkpoint exists
            const checkpoint = course.checkpoints.find(c => c._id.toString() === checkpointId);
            if (!checkpoint) {
                return res.status(404).json({ success: false, message: 'Checkpoint not found' });
            }

            // Check if already completed
            const alreadyCompleted = enrollment.completedCheckpoints.find(c => c.checkpointId.toString() === checkpointId);
            if (alreadyCompleted) {
                return res.json({ success: true, message: 'Checkpoint already completed', data: { course } });
            }

            // Add to completed checkpoints
            enrollment.completedCheckpoints.push({
                checkpointId: checkpointId,
                completedAt: new Date()
            });

            await course.save();
            return res.json({ success: true, message: 'Checkpoint completed successfully', data: { course } });
        } catch (error) {
            console.error('Complete checkpoint error:', error);
            return res.status(500).json({ success: false, message: 'Failed to complete checkpoint' });
        }
    }

    static async getStudentProgress(req, res) {
        try {
            const { courseId } = req.params;
            const course = await Course.findById(courseId);
            if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

            const enrollment = course.enrollments.find(e => e.student.toString() === req.user.id);
            if (!enrollment) {
                return res.status(400).json({ success: false, message: 'Not enrolled in this course' });
            }

            // Check for expiration
            if (!enrollment.isExpired) {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                
                if (enrollment.enrolledAt < sixMonthsAgo) {
                    enrollment.isExpired = true;
                    await course.save();
                }
            }

            const progress = {
                totalCheckpoints: course.checkpoints.length,
                completedCheckpoints: enrollment.completedCheckpoints.length,
                isExpired: enrollment.isExpired,
                enrolledAt: enrollment.enrolledAt,
                checkpoints: course.checkpoints.map(checkpoint => ({
                    ...checkpoint.toObject(),
                    isCompleted: enrollment.completedCheckpoints.some(c => c.checkpointId.toString() === checkpoint._id.toString()),
                    isExpired: enrollment.isExpired
                }))
            };

            return res.json({ success: true, data: { progress } });
        } catch (error) {
            console.error('Get student progress error:', error);
            return res.status(500).json({ success: false, message: 'Failed to get progress' });
        }
    }

    static async deleteCourse(req, res) {
        try {
            const { id } = req.params;
            const course = await Course.findById(id);

            if (!course) {
                return res.status(404).json({ success: false, message: 'Course not found' });
            }

            // Only admins can delete courses
            if (req.user.role !== 'Admin') {
                return res.status(403).json({ success: false, message: 'Only admins can delete courses' });
            }

            await Course.findByIdAndDelete(id);
            return res.json({ success: true, message: 'Course deleted successfully' });
        } catch (error) {
            console.error('Delete course error:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete course' });
        }
    }
}

module.exports = CourseController;


