const nodemailer = require('nodemailer');
var express = require('express');
var router = express.Router();
const cron = require('node-cron');
const { Prijava, Dogodek, Uporabnik } = require('../models');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', 
    port: 587,                  
    secure: false,          
    auth: {
      user: 'skupaj.tukaj@gmail.com',
      pass: process.env.GMAIL_APP_PASS
    }
  });


// Function to send event reminder emails
async function sendEventReminders() {
  try {
    console.log('Running scheduled event reminder check...');
    
    // Get current date and tomorrow's date
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Set time to start of the day for comparison
    tomorrow.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);
    
    // Find all events happening tomorrow
    const tomorrowEvents = await Dogodek.query(qb => {
      qb.where('cas', '>=', tomorrow)
        .andWhere('cas', '<=', endOfTomorrow);
    }).fetchAll({ withRelated: ['naslov', 'tipDogodka'] });
    
    if (tomorrowEvents.length === 0) {
      console.log('No events scheduled for tomorrow.');
      return;
    }
    
    console.log(`Found ${tomorrowEvents.length} events scheduled for tomorrow.`);
    
    // Process each event
    for (const dogodek of tomorrowEvents.models) {
      const dogodekId = dogodek.get('idDogodek');
      
      // Get all users registered for this event
      const prijave = await Prijava.where({ TK_dogodek: dogodekId })
        .fetchAll({ withRelated: ['uporabnik'] });
      
      if (prijave.length === 0) {
        console.log(`No users registered for event ID ${dogodekId}`);
        continue;
      }
      
      // Event details
      const eventName = dogodek.get('naziv');
      const eventTime = new Date(dogodek.get('cas'));
      const eventDesc = dogodek.get('opis');
      const eventAddress = dogodek.related('naslov');
      const eventType = dogodek.related('tipDogodka').get('naziv');
      const eventImage = dogodek.get('slika');
      
      // Format address
      const addressStr = `${eventAddress.get('ulica')} ${eventAddress.get('hisna_stevilka')}, ${eventAddress.get('postna_stevilka')} ${eventAddress.get('obcina')}`;
      
      // Format time
      const timeStr = eventTime.toLocaleString('sl-SI', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      // Send email to each registered user
      for (const prijava of prijave.models) {
        const user = prijava.related('uporabnik');
        const userEmail = user.get('email');
        const userName = `${user.get('ime')} ${user.get('priimek')}`;
        
        // Email content
        const mailOptions = {
          from: '"Skupaj Tukaj" <skupaj.tukaj@gmail.com>', 
          to: userEmail,
          subject: `Opomnik: dogodek "${eventName}" se začne jutri!`, 
          text: `Pozdravljeni ${userName},\n\nSpominjamo vas, da se dogodek "${eventName}" začne jutri ob ${timeStr}.\n\nLokacija: ${addressStr}\n\nOpis dogodka:\n${eventDesc}\n\nHvala za vašo prijavo in nasvidenje jutri!\n\nSkupaj Tukaj`, 
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); background-color: #ffffff; border: 1px solid #e0e0e0;">
              <!-- Header with logo -->
              <div style="background-color: #4299e1; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <img src="${eventImage}" alt="${eventName}" style="max-height: 80px; max-width: 100%;">
              </div>
              
              <div style="padding: 30px;">
                <div style="margin-bottom: 25px; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px;">
                  <h2 style="color: #333; margin-top: 0; font-weight: 500; font-size: 24px;">Opomnik za dogodek</h2>
                  <p style="color: #444; font-size: 16px; margin: 0;">Pozdravljeni ${userName},</p>
                </div>
                
                <div style="line-height: 1.6; color: #444; font-size: 16px;">
                  <p>Želimo vas spomniti, da se dogodek <strong style="color: #3182ce;">${eventName}</strong> začne <strong style="color: #3182ce;">jutri ob ${timeStr}</strong>.</p>
                  
                  <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3182ce;">
                    <p style="margin-top: 0; font-size: 16px;"><strong style="color: #2c5282;">Tip dogodka:</strong> ${eventType}</p>
                    <p style="font-size: 16px;"><strong style="color: #2c5282;">Lokacija:</strong> ${addressStr}</p>
                    <p style="margin-bottom: 0; font-size: 16px;"><strong style="color: #2c5282;">Čas:</strong> ${timeStr}</p>
                  </div>
                  
                  <h3 style="color: #2d3748; font-size: 18px; margin-top: 25px; border-bottom: 1px solid #edf2f7; padding-bottom: 10px;">Opis dogodka:</h3>
                  <div style="background-color: #fafafa; padding: 15px; border-radius: 6px;">
                    <p>${eventDesc.replace(/\n/g, '<br>')}</p>
                  </div>
                  
                  <p style="margin-top: 30px;">Hvala za vašo prijavo in se vidimo jutri!</p>
                </div>
                
                <div style="margin-top: 40px; padding: 15px; background-color: #f7fafc; border-radius: 6px; font-size: 14px; color: #718096; text-align: center;">
                  <p style="margin-bottom: 10px;"><strong>To je avtomatsko sporočilo, prosimo, ne odgovarjajte nanj.</strong></p>
                  <p style="margin: 0;">Za vprašanja ali pomoč nas kontaktirajte preko naše spletne strani.</p>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 14px; color: #888; text-align: center;">
                  <p style="margin-bottom: 5px;">© ${new Date().getFullYear()} Skupaj Tukaj. Vse pravice pridržane.</p>
                  <p style="margin: 0;">Ekipa Skupaj Tukaj</p>
                </div>
              </div>
            </div>
          `
        };
        
        // Send the email
        await transporter.sendMail(mailOptions);
        console.log(`Reminder email sent to ${userEmail} for event ${eventName}`);
      }
    }
    
    console.log('Event reminder check completed successfully');
  } catch (error) {
    console.error('Error in sendEventReminders:', error);
  }
}

// Schedule the function to run daily at 8:00 AM
// The cron pattern is: minute hour day-of-month month day-of-week
cron.schedule('0 8 * * *', () => {
  sendEventReminders();
});

// Manually trigger email reminders (for testing purposes)
router.post('/send-reminders', async (req, res) => {
  try {
    await sendEventReminders();
    res.status(200).json({
      success: true,
      message: 'Event reminders function triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering reminders:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while checking for event reminders'
    });
  }
});

// Contact form endpoint
router.post('/contact', async (req, res) => {
    try {
      // Get form data from request body
      const { name, email, subject, message } = req.body;
  
      // Validate required fields
      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required fields'
        });
      }
  
      // Email content
      const mailOptions = {
        from: `"${name}" ${email}`, 
        to: 'skupaj.tukaj@gmail.com',
        subject: `${subject}`, 
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`, // Plain text body
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); background-color: #ffffff;">
            <div style="margin-bottom: 25px; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px;">
              <h2 style="color: #333; margin-top: 0; font-weight: 500;">Message from ${name}</h2>
              <p style="color: #777; font-size: 14px; margin: 0;">Via contact form • ${email}</p>
            </div>
            <div style="line-height: 1.6; color: #444; font-size: 16px;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
        `
      };
  
      const info = await transporter.sendMail(mailOptions);
  
      console.log('Message sent: %s', info.messageId);
      res.status(200).json({
        success: true,
        message: 'Your message has been sent successfully!'
      });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while sending your message. Please try again later.'
      });
    }
  });

module.exports = router;
