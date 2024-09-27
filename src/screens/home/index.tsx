import React, { useState, useRef, useEffect } from "react";
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SWATCHES } from '@/colorConstants';
import { ColorSwatch, Group } from '@mantine/core';
import Draggable from 'react-draggable';
import axios from 'axios';
import { AlertCircle, Eraser, Undo, Redo, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

interface GeneratedResult {
  expression: string;
  answer: string;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('rgb(255, 255, 255)');
  const [lineWidth, setLineWidth] = useState(3);
  const [reset, setReset] = useState(false);
  const [result, setResult] = useState<GeneratedResult>();
  const [dictOfVars, setDictOfVars] = useState({});
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEraser, setIsEraser] = useState(false);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpression]);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
      setError(null);
      setUndoStack([]);
      setRedoStack([]);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 100; // Adjust for header
        ctx.lineCap = 'round';
        ctx.lineWidth = lineWidth;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveCanvasState();
      }
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
    setLatexExpression([...latexExpression, latex]);
  };

  const sendData = async () => {
    setIsLoading(true);
    setError(null);
    const canvas = canvasRef.current;

    if (canvas) {
      try {
        const response = await axios({
          method: 'post',
          url: `${import.meta.env.VITE_API_URL}/calculate`,
          data: {
            image: canvas.toDataURL('image/png'),
            dict_of_vars: dictOfVars
          }
        });

        const resp = await response.data;
        console.log('Response', resp);
        resp.data.forEach((data: Response) => {
          if (data.assign === true) {
            setDictOfVars(prevState => ({
              ...prevState,
              [data.expr]: data.result
            }));
          }
        });

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        resp.data.forEach((data: Response) => {
          setResult({
            expression: data.expr,
            answer: data.result
          });
        });
      } catch (err) {
        console.error('Error:', err);
        setError('An error occurred while processing your request. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        saveCanvasState();
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
      }
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false);
  }

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveCanvasState();
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = lineWidth;
        if (isEraser) {
          ctx.strokeStyle = 'black';
          ctx.lineWidth = lineWidth * 2;
        } else {
          ctx.strokeStyle = color;
        }
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  }

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setUndoStack(prevStack => [...prevStack, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        setRedoStack([]);
      }
    }
  }

  const undo = () => {
    const canvas = canvasRef.current;
    if (canvas && undoStack.length > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setRedoStack(prevStack => [...prevStack, currentState]);
        
        const previousState = undoStack[undoStack.length - 1];
        ctx.putImageData(previousState, 0, 0);
        setUndoStack(prevStack => prevStack.slice(0, -1));
      }
    }
  }

  const redo = () => {
    const canvas = canvasRef.current;
    if (canvas && redoStack.length > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setUndoStack(prevStack => [...prevStack, currentState]);
        
        const nextState = redoStack[redoStack.length - 1];
        ctx.putImageData(nextState, 0, 0);
        setRedoStack(prevStack => prevStack.slice(0, -1));
      }
    }
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'math_canvas.png';
      link.href = dataURL;
      link.click();
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-4 bg-gray-800">
        <div className="flex space-x-2">
          <Button
            onClick={() => setReset(true)}
            className='z-20 bg-red-500 text-white'
            variant='default'
          >
            Reset
          </Button>
          <Button
            onClick={() => setIsEraser(!isEraser)}
            className={`z-20 ${isEraser ? 'bg-blue-500' : 'bg-gray-500'} text-white`}
            variant='default'
          >
            <Eraser className="h-4 w-4 mr-2" />
            Eraser
          </Button>
          <Button onClick={undo} disabled={undoStack.length === 0} className='z-20 bg-gray-500 text-white'>
            <Undo className="h-4 w-4" />
          </Button>
          <Button onClick={redo} disabled={redoStack.length === 0} className='z-20 bg-gray-500 text-white'>
            <Redo className="h-4 w-4" />
          </Button>
          <Button onClick={downloadCanvas} className='z-20 bg-green-500 text-white'>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
        <div className="flex items-center space-x-4">
          <Group className='z-20'>
            {SWATCHES.map((swatch: string) => (
              <ColorSwatch key={swatch} color={swatch} onClick={() => setColor(swatch)} />
            ))}
          </Group>
          <div className="w-32">
            <Slider
              value={[lineWidth]}
              onValueChange={(value) => setLineWidth(value[0])}
              max={20}
              min={1}
              step={1}
            />
          </div>
        </div>
        <Button
          onClick={sendData}
          className='z-20 bg-green-500 text-white'
          variant='default'
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Run'}
        </Button>
      </div>

      <div className="relative flex-grow">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
        ></canvas>
        {latexExpression && latexExpression.map((latex, index) => (
          <Draggable
            key={index}
            defaultPosition={latexPosition}
            onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
          >
            <div className="absolute p-2 bg-white bg-opacity-75 rounded shadow-md">
              <div className="latex-content">{latex}</div>
            </div>
          </Draggable>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
