// /ai-service/src/emailHandler.ts (MODIFICADO)
import nodemailer, { Transporter } from 'nodemailer';

// Variable para almacenar el transporter (ya sea real o de prueba)
let transporter: Transporter;

/**
 * Inicializa el transporter de Nodemailer. Usa Ethereal para desarrollo local 
 * si no se encuentran credenciales SMTP reales en el entorno.
 */
async function initializeTransporter(): Promise<Transporter> {
    if (transporter) {
        return transporter;
    }
    
    // ⭐️ Opción 1: Configuración Real (usada si el .env es completo)
    if (process.env.MAIL_HOST && process.env.EMAIL_USER) {
        console.log("Nodemailer usando configuración SMTP real.");
        transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT) || 587,
            secure: process.env.MAIL_PORT === '465',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    } else {
        // ⭐️ Opción 2: Ethereal (Para pruebas locales sin SMTP)
        console.log("🛠️ Nodemailer usando Ethereal para pruebas locales.");
        const testAccount = await nodemailer.createTestAccount();

        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user, // Usuario generado por Ethereal
                pass: testAccount.pass, // Contraseña generada por Ethereal
            },
        });
        
        // MUESTRA EL ENLACE CLAVE EN CONSOLA
        //console.log(`\n🎉 Correo de prueba listo. Revisa tu resumen en: ${nodemailer.getTestMessageUrl(transporter.options.auth as any)}\n`);
    }

    return transporter;
}

export async function sendSummaryEmail(toEmails: string[], subject: string, htmlContent: string) {
  
    try {
        const mailTransporter = await initializeTransporter();
        
        const mailOptions = {
            from: `"AI Summary Bot" <${process.env.EMAIL_USER || "ai-test@voicely.com"}>`,
            to: toEmails.join(', '), 
            subject: subject,
            html: htmlContent,
        };

        const info = await mailTransporter.sendMail(mailOptions);
        
        // Si usamos Ethereal, mostramos el enlace para ver el correo
        if (nodemailer.getTestMessageUrl(info)) {
             console.log(`✅ Correo de resumen generado en: ${nodemailer.getTestMessageUrl(info)}`);
        } else {
             console.log(`✅ Correo de resumen enviado con éxito a: ${toEmails.join(', ')}`);
        }

    } catch (error) {
        console.error(`❌ Error al enviar correo de resumen:`, error);
        throw new Error("Fallo en el envío del correo.");
    }
}