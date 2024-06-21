'use strict';

let gl;
let resUniform;
let timeUniform;

function compileShader(type, src)
{
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        console.log(`Error Compiling Shader: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}


function loadShaderProgram(vertSrc, fragSrc)
{
    const vertShader = compileShader(gl.VERTEX_SHADER, vertSrc);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, fragSrc);

    if (vertShader === null || fragShader === null)
    {
        gl.deleteShader(vertShader);
        gl.deleteShader(fragShader);
        return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    gl.detachShader(program, vertShader);
    gl.detachShader(program, fragShader);

    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);

    if(!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
        console.log(`Failed to link shader program: ${gl.getProgramInfoLog(program)}`);
        return null;
    }

    return program;
}


async function loadRemoteShaderProgram(vertUrl, fragUrl)
{
    const results = await Promise.all([fetch(vertUrl), fetch(fragUrl)]);

    //Load shader source
    const vertexResponse = results[0];
    const fragmentResponse = results[1];

    if(!vertexResponse.ok || !fragmentResponse.ok)
    {
        return null;
    }

    const vertexText = await vertexResponse.text();
    const fragmentText = await fragmentResponse.text();

    //Compile shader
    return loadShaderProgram(vertexText, fragmentText);
}

function render(timestamp) 
{
    if(gl.canvas.width !== gl.canvas.clientWidth || gl.canvas.height !== gl.canvas.clientHeight)
    {
        gl.canvas.width = gl.canvas.clientWidth;
        gl.canvas.height = gl.canvas.clientHeight;
        gl.viewport(0,0, gl.canvas.width, gl.canvas.height);
        gl.uniform2fv(resUniform,  [gl.canvas.width, gl.canvas.height]);
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniform1f(timeUniform, timestamp/1000);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    window.requestAnimationFrame(render);
}

async function main(fragUrl)
{
    const canvas = document.querySelector("#main-canvas");
    gl = canvas.getContext("webgl2");

    if(gl === null)
    {
        fallbackRedirect();
        return;
    }

    //Make the canvas match the size set by CSS
    gl.canvas.width = gl.canvas.clientWidth;
    gl.canvas.height = gl.canvas.clientHeight;

    //Basic viewport setup
    gl.viewport(0,0, gl.canvas.clientWidth, gl.canvas.clientHeight);
    gl.clearColor(0.3,0.6,0.9,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const shaderProgram = await loadRemoteShaderProgram("/assets/shaders/common/shadersandbox.vs", fragUrl);
    gl.useProgram(shaderProgram);
    const posAttr = gl.getAttribLocation(shaderProgram, "aPosition");
    resUniform = gl.getUniformLocation(shaderProgram, "resolution");
    timeUniform = gl.getUniformLocation(shaderProgram, "time");
    gl.uniform2fv(resUniform,  [gl.canvas.clientWidth, gl.canvas.clientHeight]);
    gl.uniform1f(timeUniform, 0);
    gl.enableVertexAttribArray(posAttr);

    const vertBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
    const vertices = [
        -1.0, 1.0,
        -1.0, -1.0,
        1.0, 1.0,
        1.0, -1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    render(0);
}