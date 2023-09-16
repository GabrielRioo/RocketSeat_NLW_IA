import { FastifyInstance } from "fastify";
import { fastifyMultipart } from '@fastify/multipart'
import { prisma } from "../lib/prisma";
import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
    app.register(fastifyMultipart, {
        limits: {
            fileSize: 1_048_576 * 25 // 1 Megabyte * 25 = 25mb
        }
    })

    app.post('/videos', async (request, reply) => {
        const data = await request.file()

        // Verifica se tem o arquivo
        if (!data) {
            return reply.status(400).send({ error: "Missing file input." });
        }

        // Retorna a extenção do arquivo.
        const extension = path.extname(data.filename)

        if (extension !== ".mp3") {
            return reply.status(400).send({ "error": "Invalid input type, please upload a MP3" });
        }

        // Retorna o nome do arquivo sem a extenção
        const fileBaseName = path.basename(data.filename, extension)

        // Criar o nome novo do arquivo
        const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`;

        // Pasta do arquivo
        const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)

        await pump(data.file, fs.createWriteStream(uploadDestination));

        // Adicionando no banco de dados
        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadDestination,
            }
        })

        return {
            video,
        }
    })
}