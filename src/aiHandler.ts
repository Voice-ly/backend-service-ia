// /ai-service/src/aiHandler.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// ATENCIÓN: Se usa la clave literal proporcionada para la prueba.
const API_KEY = process.env.GEMINI_API_KEY;

// NUEVO LOG DE SEGURIDAD
if (API_KEY && API_KEY.length > 5) {
    console.log(
        `[DEBUG API KEY] Clave cargada correctamente. Fragmento: ${API_KEY.substring(0, 8)}...`
    );
} else {
    console.error("ERROR: La variable API_KEY está vacía o es muy corta.");
}
// Inicializa la instancia de Gemini
const genAI = new GoogleGenerativeAI(API_KEY || "dummy-key");

export async function generateMeetingSummary(
    history: Array<{ user: string; text: string }>
): Promise<string> {
    // Verificación de la Clave
    if (!API_KEY) {
        return "<h1>Resumen generado por IA:</h1><p>Error de configuración: La clave de la API de Gemini no está cargada.</p>";
    }

    // Inicialización del Modelo
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Formato del Texto de Entrada
    const transcriptText = history
        .map((msg) => `[${msg.user}]: ${msg.text}`)
        .join("\n");

    // LOG DE DEPURATION: Texto de entrada
    console.log(
        "[DEBUG AI] Texto final de la conversación enviado a Gemini:\n",
        transcriptText
    );

    // Verificación de Contenido Mínimo (Evita llamadas si el chat está casi vacío)
    if (transcriptText.trim().length < 20) {
        console.warn(
            "[AI Handler] Input de conversación muy corto. Omitiendo llamada a Gemini."
        );
        return "<h1>Resumen generado por IA:</h1><p>Resumen no disponible. Contenido insuficiente o irrelevante en la transcripción.</p>";
    }

    // El Prompt para Generación de Resumen Detallado
    const prompt = `
        Eres un asistente de reuniones. Analiza la siguiente transcripción.
        
        TRANSCRIPCIÓN:
        ---
        ${transcriptText}
        ---

        TAREA:
        Genera un resumen completo y estructurado en formato HTML. El resumen debe incluir:
        1. Un título de nivel 2 (<h2>) con un resumen general de la conversación.
        2. Una sección de participantes activos (<h2>) y una lista no ordenada (<ul>) con los nombres de quienes enviaron mensajes.
        3. Una sección de compromisos/tareas (<h2>) y una lista no ordenada (<ul>) con los puntos de acción y la persona asignada. Si no hay tareas, indica "No se identificaron tareas claras.".
        
        Responde ÚNICAMENTE con el código HTML. NO incluyas bloques de Markdown como \`\`\`html.
        `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;

        // LOG CRÍTICO: Imprime el objeto de respuesta completo (por si hay un campo de error)
        console.log(
            "[DEBUG AI] Respuesta completa del modelo:",
            JSON.stringify(response, null, 2)
        );

        // Obtener el texto (Corrección de TypeScript: llamar a la función)
        let text = response.text();

        // Verificación de Respuesta Vacía
        if (text.trim() === "") {
            console.error(
                "GEMINI DEVOLVIÓ UN TEXTO COMPLETAMENTE VACÍO. La clave puede estar fallando o la cuota agotada."
            );
            return "<h1>Resumen generado por IA:</h1><p>ERROR: Respuesta de la IA completamente vacía. Verifique la API Key.</p>";
        }

        // Limpieza de formato
        text = text.replace(/```html/g, "").replace(/```/g, "");

        return text;
    } catch (error: any) {
        // Manejo de Fallos de Conexión o Autenticación
        console.error("🔴 ERROR CRÍTICO AL LLAMAR A GEMINI:", error.message);
        return `<h1>Error de Servicio AI:</h1><p>Verifique la clave API/cuota/red. Detalle: ${error.message}</p>`;
    }
}
