// /ai-service/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config'; 
import { generateMeetingSummary } from './src/aiHandler'; // La función que necesitamos
import { sendSummaryEmail } from './src/emailHandler'; 

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true }));

// --- Definiciones de Interfaces (TypeScript) ---
interface SummaryRequestBody { 
    meetingId: string;
    participants: Array<{ email: string, [key: string]: any }>; // Asegura que 'participants' tenga al menos 'email'
    chatHistory: Array<{ user: string; text: string; timestamp: string }>; 
}

// Nota: No es necesario extender Request para tipar el body si usas req.body: SummaryRequestBody
// Pero puedes mantenerlo si lo necesitas en otros archivos:
// interface SummaryRequest extends Request { body: SummaryRequestBody; }


// --- Endpoint de Orquestación Principal (Usando Gemini) ---

app.post('/process-meeting', async (req: Request, res: Response) => {
    // Usamos la aserción de tipo para TypeScript
    const { meetingId, participants, chatHistory } = req.body as SummaryRequestBody;
    
    // ... (Logs y verificaciones existentes) ...

    if (!chatHistory || chatHistory.length === 0) {
        console.warn(`[AI FATAL] Historial de chat vacío para ${meetingId}. Se omite el resumen.`);
        // Envía un correo con un mensaje de chat vacío, o simplemente termina.
        return res.status(200).send("Processing complete, chat history was empty.");
    }

    // ⭐️ CORRECCIÓN CLAVE: Mapear participantes a correos válidos ⭐️
    // Asumimos que cada participante es un objeto con un campo 'email'.
    const recipientEmails = participants
        .map((p) => p.email)
        .filter((email: string) => email && email.includes('@')); 

    try {
        // ⭐️⭐️⭐️ SOLUCIÓN: LLAMADA REAL A LA FUNCIÓN DE IA ⭐️⭐️⭐️
        // El chatHistory tiene más campos de los que AI Handler necesita, TypeScript permite pasar el array
        // porque son compatibles con los campos 'user' y 'text'.
        const summaryHtml = await generateMeetingSummary(chatHistory); 
        // ⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️

        // Este log ahora mostrará el resumen real devuelto por la IA
        console.log(`[DEBUG AI] Resumen generado (primeras 100 caracteres):`, summaryHtml ? summaryHtml.substring(0, 100) : 'NULL/VACÍO');

        const subject = `[Voicely] Resumen de la Reunión ${meetingId}`;

        // ... (Verificación y envío de correo) ...
        if (recipientEmails.length === 0) {
             console.warn(`⚠️ No hay destinatarios válidos para la reunión ${meetingId}. Se omite el envío de correo.`);
             return res.status(200).send("Processing complete, no emails sent.");
        }

        await sendSummaryEmail(recipientEmails, subject, summaryHtml);
        console.log(`✅ Correo de resumen enviado con éxito a: ${recipientEmails.join(', ')}`);

        return res.status(200).send("Processing complete, email sent.");

    } catch (error) {
        console.error('Error procesando la reunión:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor de IA. Revisar logs.' });
    }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
    console.log(`🚀 Microservicio de IA (Gemini) corriendo en puerto ${PORT}`);
});