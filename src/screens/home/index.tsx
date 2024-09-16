import { useState , useRef } from "react"

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing , setisDrawing] = useState(false);
  useEffect( () => {
    const canvas = canvasRef.current;
    if (canvas){
        const ctx = canvas.getContext('2d');
        if (ctx){
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        
        }
    }
  })
  const StartDrawing = ( e : React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas){
        canvas.style.background = 'black';
        const ctx = canvas.getContext('2d');
        if (ctx){
            ctx.beginPath();
            ctx.moveTo(e.nativeEvent.offsetX , e.nativeEvent.offsetY);
            setisDrawing(true);
        }
    }
    
  }
  const stopDrawing = () => {
        setisDrawing(false);
    }

   const draw = (e : React.MouseEvent<HTMLCanvasElement>) => {
     if (!isDrawing) return;
     const canvas = canvasRef.current;
     if (canvas){
        const ctx = canvas.getContext('2d');
        if (ctx){
            ctx.strokeStyle = 'white';
            ctx.lineTo(e.nativeEvent.offsetX , e.nativeEvent.offsetY);
            ctx.stroke();
        }

   }
  return(
    <canvas ref={canvasRef} 
    id ='canvas'
    className="aboslute top-0 left-0 w-full h-full"
    onMouseDown={StartDrawing}
    onMouseUp={stopDrawing}
    onMouseOut={stopDrawing}
    ></canvas>
  )
}

}