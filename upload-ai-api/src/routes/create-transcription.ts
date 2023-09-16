import { FastifyInstance } from "fastify";
import { z } from 'zod'
import { prisma } from "../lib/prisma";
import { createReadStream } from "node:fs"
import { openai } from "../lib/openai";

export async function createTranscriptionRoute(app: FastifyInstance) {
    app.post('/videos/:videoId/transcription', async (req) => {
        const paramsSchema = z.object({
            videoId: z.string().uuid(),
        })
        const {videoId} = paramsSchema.parse(req.params) 

        const bodySchema = z.object({
            prompt: z.string(),
        })
        const { prompt } = bodySchema.parse(req.body)

        // Pegar arquivo de audio para transcrição
        const video = await prisma.video.findFirstOrThrow({
            where: {
                id: videoId,
            }
        })

        // caminho onde o video foi salvo
        const videoPath = video.path

        // Ler arquivo
        const audioReadStream = createReadStream(videoPath);

        // Transcrever arquivo
        const response = await openai.audio.transcriptions.create({
            file: audioReadStream,
            model: 'whisper-1',
            language: 'pt',
            response_format: 'json',
            temperature: 0,
            prompt,
        })

        const transcription = response.text

        // Salvar o texto dentro do banco de dados
        await prisma.video.update({
            where: {
                id: videoId
            },
            data: {
                transcription
            }
        })

        return { transcription }
    })
}