import { Resend } from 'resend';
import logger from './logger';

const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn('RESEND_API_KEY is not configured in environment variables.');
    return null;
  }
  return new Resend(apiKey);
};

export interface WelcomeCredentialsEmailOptions {
  to: string;
  recipientName: string;
  role: 'teacher' | 'student' | 'school_admin' | 'parent';
  temporaryPassword: string;
  schoolName: string;
  schoolCode?: string;
  loginUrl?: string;
}

export async function sendWelcomeCredentialsEmail(options: WelcomeCredentialsEmailOptions): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    logger.error('Cannot send welcome email: Resend client is not available');
    return false;
  }

  const emailFrom = process.env.EMAIL_FROM || 'PNG School Management <noreply@kumullinked.tech>';
  const loginUrl = options.loginUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
  const roleTitle = options.role === 'teacher' ? 'Faculty & Teacher' : options.role === 'student' ? 'Student' : options.role === 'school_admin' ? 'School Administrator' : 'Parent';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to PNG-SMS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #0f172a 100%); padding: 32px 30px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">PNG School Management System</h1>
              <p style="color: #cbd5e1; font-size: 14px; margin: 6px 0 0 0;">Official Academic & Faculty Portal</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 30px;">
              <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Welcome, ${options.recipientName}!</h2>
              
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                An official <strong>${roleTitle}</strong> account has been created for you at <strong>${options.schoolName}</strong>${options.schoolCode ? ` (${options.schoolCode})` : ''}.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #1e40af; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
                <h3 style="color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">Your Portal Login Credentials</h3>
                
                <table role="presentation" width="100%" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 130px;">Portal URL:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #1e40af;">
                      <a href="${loginUrl}" style="color: #1e40af; text-decoration: underline;">${loginUrl}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Username / Email:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a; font-family: Consolas, monospace;">${options.to}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Temporary Password:</td>
                    <td style="padding: 6px 0;">
                      <span style="display: inline-block; background: #e0e7ff; color: #1e40af; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-family: Consolas, monospace; font-size: 15px; letter-spacing: 1px;">
                        ${options.temporaryPassword}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Important Security Notice -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="vertical-align: top; padding-right: 12px; color: #d97706; font-size: 18px;">🔒</td>
                    <td>
                      <p style="margin: 0; color: #92400e; font-size: 13.5px; line-height: 1.5;">
                        <strong>Mandatory Password Reset:</strong> For your security, you will be prompted to set your personal permanent password immediately after your first login.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Call to action button -->
              <div style="text-align: center; margin: 32px 0 20px 0;">
                <a href="${loginUrl}" style="display: inline-block; background-color: #1e40af; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(30, 64, 175, 0.2);">
                  Sign In to School Portal
                </a>
              </div>

              <p style="color: #64748b; font-size: 13px; margin: 24px 0 0 0; text-align: center;">
                If you did not expect this invitation or have any trouble logging in, please contact your school administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} Papua New Guinea School Management System &bull; All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: [options.to],
      subject: `Welcome to ${options.schoolName} - Your PNG-SMS Login Credentials`,
      html,
      text: `Welcome ${options.recipientName}!\n\nYour account has been created for ${options.schoolName}.\n\nLogin URL: ${loginUrl}\nEmail: ${options.to}\nTemporary Password: ${options.temporaryPassword}\n\nPlease sign in and update your password immediately upon login.\n\nPNG School Management System`,
    });

    if (error) {
      logger.error(`Resend email error for ${options.to}:`, error);
      return false;
    }

    logger.info(`Welcome credentials email successfully sent to ${options.to} (Message ID: ${data?.id})`);
    return true;
  } catch (err) {
    logger.error(`Exception while sending welcome email to ${options.to}:`, err);
    return false;
  }
}
