"use strict";

let canvas;
let gl;
let glShader;

let lastTimeStamp;

function render(timeStamp)
{
    const delta = timeStamp - lastTimeStamp;
    lastTimeStamp = timeStamp;

    if(gl.canvas.width !== gl.canvas.clientWidth || gl.canvas.height !== gl.canvas.clientHeight)
    {
        gl.canvas.width = gl.canvas.clientWidth;
        gl.canvas.height = gl.canvas.clientHeight;
        gl.viewport(0,0, gl.canvas.clientWidth, gl.canvas.clientHeight);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    window.requestAnimationFrame(render)
}

async function main()
{
    canvas = document.querySelector("#canvas");
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
    gl.clearColor(0.1,0.1,0.1,1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    let perspectiveProjMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(perspectiveProjMatrix, 40*Math.PI/180, gl.canvas.clientWidth/gl.canvas.clientHeight, 0.1, 100);

    let orthoProjMatrix = glMatrix.mat4.create();
    glMatrix.mat4.ortho(orthoProjMatrix, -5, 5, -5, 5, 0.1, 10);

    lastTimeStamp = performance.now();

    render(0);
}

window.onload = main;