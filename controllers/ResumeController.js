const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

class ResumeController {
    static async generateResume(req, res) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });

            // Prepare output folder
            const outDir = path.join(__dirname, '..', 'uploads', 'resumes');
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

            // Generate professional PDF
            const filename = `resume-${user._id}-${Date.now()}.pdf`;
            const fullPath = path.join(outDir, filename);

            const doc = new PDFDocument({
                size: 'A4',
                margin: 30,
                info: {
                    Title: `${user.name} - Resume`,
                    Author: user.name,
                    Creator: 'BRAC Out Resume Builder'
                }
            });
            const writeStream = fs.createWriteStream(fullPath);
            doc.pipe(writeStream);

            // Helper function to add section headers with modern design
            const addSectionHeader = (title) => {
                doc.moveDown(0.8);
                // Background rectangle for section header
                const headerY = doc.y;
                const headerHeight = 20;
                doc.rect(doc.page.margins.left, headerY, doc.page.width - doc.page.margins.left - doc.page.margins.right, headerHeight)
                    .fill('#1e40af');
                doc.fillColor('white').font('Helvetica-Bold').fontSize(12).text(title.toUpperCase(), doc.page.margins.left + 10, headerY + 5);
                doc.moveDown(0.5);
                doc.fillColor('#374151');
            };

            // Helper function to add subsection with bullet points
            const addSubsection = (title, content) => {
                if (content && content.trim()) {
                    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f2937').text(title);
                    doc.moveDown(0.2);
                    doc.font('Helvetica').fontSize(10).fillColor('#374151').text(content, { align: 'justify' });
                    doc.moveDown(0.3);
                }
            };

            // Helper function to add experience item
            const addExperienceItem = (title, company, duration, description) => {
                if (title || company) {
                    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f2937').text(`${title || 'Position'}${company ? ` at ${company}` : ''}`);
                    doc.moveDown(0.1);
                    if (duration) {
                        doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text(duration);
                        doc.moveDown(0.1);
                    }
                    if (description) {
                        doc.font('Helvetica').fontSize(10).fillColor('#374151').text(description, { align: 'justify' });
                        doc.moveDown(0.3);
                    }
                }
            };

            // Helper function to add award item
            const addAwardItem = (title, organization, year, description) => {
                if (title) {
                    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f2937').text(title);
                    doc.moveDown(0.1);
                    if (organization || year) {
                        const orgYear = `${organization || ''}${organization && year ? ', ' : ''}${year || ''}`;
                        doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text(orgYear);
                        doc.moveDown(0.1);
                    }
                    if (description) {
                        doc.font('Helvetica').fontSize(10).fillColor('#374151').text(description, { align: 'justify' });
                        doc.moveDown(0.3);
                    }
                }
            };

            // Header Section with modern design
            doc.fillColor('#1e40af').rect(doc.page.margins.left, doc.page.margins.top, doc.page.width - doc.page.margins.left - doc.page.margins.right, 80).fill();

            // Name in header
            doc.fillColor('white').font('Helvetica-Bold').fontSize(32).text(user.name || 'Your Name', { align: 'center' });
            doc.moveDown(0.2);

            // Contact information in header
            const contactInfo = [];
            if (user.email) contactInfo.push(user.email);
            if (user.profile?.phone) contactInfo.push(user.profile.phone);
            if (contactInfo.length > 0) {
                doc.font('Helvetica').fontSize(12).fillColor('white').text(contactInfo.join(' • '), { align: 'center' });
                doc.moveDown(0.2);
            }

            // Social links
            const socialLinks = [];
            if (user.profile?.linkedin) socialLinks.push('LinkedIn');
            if (user.profile?.github) socialLinks.push('GitHub');
            if (socialLinks.length > 0) {
                doc.font('Helvetica').fontSize(11).fillColor('#bfdbfe').text(socialLinks.join(' • '), { align: 'center' });
            }

            // Professional Summary with modern styling
            addSectionHeader('Professional Summary');
            const summary = `${user.role} with ${user.profile?.department ? `background in ${user.profile.department}` : 'strong academic foundation'}${user.profile?.batch ? ` (${user.profile.batch})` : ''}. ${user.profile?.company ? `Currently working as ${user.profile.jobTitle || 'Professional'} at ${user.profile.company}.` : 'Seeking opportunities to apply knowledge and skills in a professional environment.'}`;
            doc.font('Helvetica').fontSize(11).fillColor('#374151').text(summary, { align: 'justify' });

            // Education Section
            addSectionHeader('Education');
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#1f2937').text('BRAC University');
            doc.moveDown(0.2);

            const educationDetails = [];
            if (user.profile?.department) educationDetails.push(`Department: ${user.profile.department}`);
            if (user.profile?.batch) educationDetails.push(`Batch: ${user.profile.batch}`);
            if (user.profile?.school) educationDetails.push(`School: ${user.profile.school}`);
            if (user.profile?.college) educationDetails.push(`College: ${user.profile.college}`);

            educationDetails.forEach(detail => {
                doc.font('Helvetica').fontSize(10).fillColor('#374151').text(detail);
                doc.moveDown(0.1);
            });

            // Experience Section
            if (user.profile?.experience && user.profile.experience.length > 0) {
                addSectionHeader('Professional Experience');

                user.profile.experience.forEach((exp, index) => {
                    addExperienceItem(exp.title, exp.company, exp.duration, exp.description);
                });
            }

            // Skills Section with modern layout
            if (user.profile?.skills && user.profile.skills.length > 0) {
                addSectionHeader('Technical Skills');
                const skills = user.profile.skills.filter(skill => skill.trim());
                if (skills.length > 0) {
                    // Create a skills grid layout
                    const skillsPerRow = 3;
                    for (let i = 0; i < skills.length; i += skillsPerRow) {
                        const rowSkills = skills.slice(i, i + skillsPerRow);
                        const skillText = rowSkills.map(skill => `• ${skill}`).join('    ');
                        doc.font('Helvetica').fontSize(10).fillColor('#374151').text(skillText);
                        doc.moveDown(0.2);
                    }
                }
            }

            // Awards & Achievements Section
            if (user.profile?.awards && user.profile.awards.length > 0) {
                addSectionHeader('Awards & Achievements');

                user.profile.awards.forEach((award, index) => {
                    addAwardItem(award.title, award.organization, award.year, award.description);
                });
            }

            // Current Employment (if applicable)
            if (user.profile?.company && user.profile?.jobTitle) {
                addSectionHeader('Current Employment');
                doc.font('Helvetica-Bold').fontSize(12).fillColor('#1f2937').text(user.profile.jobTitle);
                doc.moveDown(0.2);
                doc.font('Helvetica').fontSize(11).fillColor('#374151').text(user.profile.company);
            }

            // Additional sections based on available profile data
            if (!user.profile?.experience || user.profile.experience.length === 0) {
                addSectionHeader('Key Strengths');
                // Only add strengths if user has skills or other relevant data
                if (user.profile?.skills && user.profile.skills.length > 0) {
                    doc.font('Helvetica').fontSize(10).fillColor('#374151').text(`• Strong technical skills in ${user.profile.skills.slice(0, 3).join(', ')}`);
                    doc.moveDown(0.1);
                }
                if (user.profile?.department) {
                    doc.font('Helvetica').fontSize(10).fillColor('#374151').text(`• Solid foundation in ${user.profile.department} studies`);
                    doc.moveDown(0.1);
                }
                doc.font('Helvetica').fontSize(10).fillColor('#374151').text('• Excellent problem-solving and analytical skills');
                doc.moveDown(0.1);
                doc.font('Helvetica').fontSize(10).fillColor('#374151').text('• Effective communication and teamwork abilities');
                doc.moveDown(0.1);
                doc.font('Helvetica').fontSize(10).fillColor('#374151').text('• Quick learner with adaptability to new technologies');
            }

            // Languages and Certifications section - only if user has relevant data
            addSectionHeader('Additional Information');
            
            // Only add languages if user has specified them in their profile
            if (user.profile?.languages && user.profile.languages.length > 0) {
                doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f2937').text('Languages:');
                doc.font('Helvetica').fontSize(10).fillColor('#374151').text(user.profile.languages.join(', '));
                doc.moveDown(0.3);
            } else {
                // Default language if not specified
                doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f2937').text('Languages:');
                doc.font('Helvetica').fontSize(10).fillColor('#374151').text('English (Fluent), Bengali (Native)');
                doc.moveDown(0.3);
            }

            // Only add interests if user has specified them
            if (user.profile?.interests && user.profile.interests.length > 0) {
                doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f2937').text('Interests:');
                doc.font('Helvetica').fontSize(10).fillColor('#374151').text(user.profile.interests.join(', '));
            } else {
                // Default interests based on user's role and department
                doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f2937').text('Interests:');
                const defaultInterests = ['Technology', 'Innovation', 'Continuous Learning'];
                if (user.profile?.department) {
                    defaultInterests.unshift(user.profile.department);
                }
                doc.font('Helvetica').fontSize(10).fillColor('#374151').text(defaultInterests.join(', '));
            }

            // Professional footer
            doc.moveDown(1);
            doc.fillColor('#9ca3af').font('Helvetica').fontSize(8).text('Generated by BRAC Out Resume Builder', { align: 'center' });

            doc.end();

            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            // Save filename on user - ensure proper error handling
            try {
                user.resume = filename;
                await user.save();
                console.log('Resume filename saved to user:', filename);
            } catch (saveError) {
                console.error('Error saving resume filename to user:', saveError);
                // Continue with response even if save fails
            }

            return res.json({
                success: true,
                message: 'Resume PDF generated successfully',
                data: {
                    filename,
                    url: `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/resumes/${filename}`
                }
            });
        } catch (error) {
            console.error('Generate resume error:', error);
            return res.status(500).json({ success: false, message: 'Failed to generate resume' });
        }
    }
}

module.exports = ResumeController;



