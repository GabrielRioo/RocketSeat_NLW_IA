import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-separator";
import { FileVideo, Upload } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

const statusMessages = {
    converting: 'Convertendo...',
    generating: 'Transcrevendo...',
    uploading: 'Carregando...',
    success: 'Concluido!'
}

interface VideoInputFormProps {
    onVideoUploaded: (id: string) => void;
}

export function VideoInputForm(props: VideoInputFormProps) {
    // Armazenar o video enviado pelo usuário
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [status, setStatus] = useState<Status>('waiting')

    const promptInputRef = useRef<HTMLTextAreaElement>(null)

    function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
        const { files } = event.currentTarget

        if (!files) {
            return
        }

        // Pegar o primeiro arquivo
        const selectedFile = files[0]

        setVideoFile(selectedFile)
    }

    // Função para converter um video para audio
    async function convertVideoToAudio(video: File) {
        console.log('Convert Started')
        const ffmpeg = await getFFmpeg()

        await ffmpeg.writeFile('input.mp4', await fetchFile(video))

        ffmpeg.on('log', log => {
            console.log(log)
        })

        ffmpeg.on('progress', progress => {
            console.log('Convert progress: ' + Math.round(progress.progress * 100))
        })

        await ffmpeg.exec([
           '-i',
           'input.mp4',
           '-map',
           '0:a',
           '-b:a',
           '20k',
           '-acodec',
           'libmp3lame',
           'output.mp3' 
        ])

        const data = await ffmpeg.readFile('output.mp3')

        const audioFileBlob = new Blob([data], {type: 'audio/mpeg'})
        const audioFile = new File([audioFileBlob], 'audio.mp3', {
            type: 'audio/mpeg'
        })

        console.log('Convert finished')

        return audioFile
    }

    async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const prompt = promptInputRef.current?.value

        if (!videoFile) {
            return
        }

        // converter o video em audio
        setStatus('converting')
        const audioFile = await convertVideoToAudio(videoFile)

        const data = new FormData()

        data.append('file', audioFile)

        setStatus('uploading')
        const response = await api.post('/videos', data)

        const videoId = response.data.video.id

        setStatus('generating')
        await api.post(`/videos/${videoId}/transcription`, {
            prompt,
        })

        setStatus('success')
        console.log('finalizou')

        props.onVideoUploaded(videoId)
    }

    // a variável previewUrl so vai ser recriada, se o videoFile mudar
    const previewUrl = useMemo(() => {
        if (!videoFile) {
            return null
        }

        // cria uma URL de previsualização
        return URL.createObjectURL(videoFile)
    }, [videoFile])

    return (
        <form onSubmit={handleUploadVideo} className='space-y-6'>
            <label
                htmlFor='video'
                className='relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground overflow-hidden hover:border-primary/80 transition ease-in-out '
            >
                {previewUrl ? (
                    <video src={previewUrl} controls={false} className="pointer-events-none absolute inset-0"/>
                ) : (
                    <>
                        <FileVideo className='w-4 h-4' />
                        Selecione um vídeo
                    </>
                )} 
            </label>

            <input type="file" id='video' accept='video/mp4' className='sr-only' onChange={handleFileSelected}/>
            <Separator />

            <div className='space-y-2'>
                <Label htmlFor='transcription_prompt'>Prompt de transcrição</Label>
                <Textarea
                    ref={promptInputRef}
                    disabled={status !== 'waiting'}
                    id='transcription_prompt'
                    className='h-20 leading-relaxed resize-none'
                    placeholder='Inclua palavras-chaves mencionadas no vídeo separadas por vírgula (,)'
                />
            </div>

            <Button 
                data-success={status === 'success'}
                disabled={status !== 'waiting'} 
                type='submit' 
                className='w-full data-[success=true]:bg-emerald-400'>
                {status === 'waiting' ? (
                    <>
                        Carregar vídeo
                        <Upload className='w-4 h-4 ml-2' />
                    </>
                ): statusMessages[status]}
                
            </Button>
        </form>
    )
}