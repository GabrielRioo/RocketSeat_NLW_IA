import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-separator";
import { FileVideo, Upload } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ChangeEvent, useMemo, useState } from "react";

export function VideoInputForm() {
    // Armazenar o video enviado pelo usuário
    const [videoFile, setVideoFile] = useState<File | null>(null)

    function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
        const { files } = event.currentTarget

        if (!files) {
            return
        }

        // Pegar o primeiro arquivo
        const selectedFile = files[0]

        setVideoFile(selectedFile)
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
        <form className='space-y-6'>
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
                    id='transcription_prompt'
                    className='h-20 leading-relaxed resize-none'
                    placeholder='Inclua palavras-chaves mencionadas no vídeo separadas por vírgula (,)'
                />
            </div>

            <Button type='submit' className='w-full'>
                Carregar vídeo
                <Upload className='w-4 h-4 ml-2' />
            </Button>
        </form>
    )
}