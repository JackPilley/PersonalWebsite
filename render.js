"use strict";

let canvas;
let gl;
let adsShader;
let shadowShader;

let viewMatrix;

let models = [];
let directionalLight;

let lastTimeStamp;

/**
 * Redirects to a simple fallback page. Used in case of error.
 */
function fallbackRedirect()
{
    //window.location.href = "/fallback.html";
}

function render(timeStamp)
{
    const delta = timeStamp - lastTimeStamp;
    lastTimeStamp = timeStamp;

    if(gl.canvas.width !== gl.canvas.clientWidth || gl.canvas.height !== gl.canvas.clientHeight)
    {
        gl.canvas.width = gl.canvas.clientWidth;
        gl.canvas.height = gl.canvas.clientHeight;
        gl.viewport(0,0, gl.canvas.clientWidth, gl.canvas.clientHeight);
        glMatrix.mat4.perspective(adsShader.projectionMatrix,
            80*Math.PI/180,
            gl.canvas.clientWidth/gl.canvas.clientHeight,
            0.1, 100);
        adsShader.Use();
        gl.uniformMatrix4fv(adsShader.uniforms.projectionMatrix, false, adsShader.projectionMatrix);
        adsShader.StopUsing();
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    //glMatrix.mat4.rotateX(model.transformMatrix, model.transformMatrix, 0.001 * delta);

    viewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.rotateX(viewMatrix, viewMatrix, 0.5);
    glMatrix.mat4.translate(viewMatrix, viewMatrix, [0.0, -2.0, -3.0]);
    glMatrix.mat4.rotateY(viewMatrix, viewMatrix, 0.0005 * timeStamp);

    //ShadowPass();
    ADSPass();

    window.requestAnimationFrame(render)
}

function ShadowPass()
{
    shadowShader.Use();

    gl.uniformMatrix4fv(shadowShader.uniforms.viewMatrix, false, directionalLight.viewMatrix);

    for(const model of models) {
        shadowShader.DrawModel(model, directionalLight.viewMatrix);
    }

    shadowShader.StopUsing();
}

function ADSPass()
{
    adsShader.Use();

    gl.uniformMatrix4fv(adsShader.uniforms.viewMatrix, false, viewMatrix);

    for(const model of models) {
        adsShader.DrawModel(model, viewMatrix);
    }

    adsShader.StopUsing();
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
    gl.clearColor(0,0.4,0.6,1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    let perspectiveProjMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(perspectiveProjMatrix,
        75*Math.PI/180,
        gl.canvas.clientWidth/gl.canvas.clientHeight,
        0.1, 100);

    //Find attribute and uniform locations
    adsShader = new ADSShader(gl, perspectiveProjMatrix);
    if(await adsShader.InitializeFromURL('shaders/model.v', 'shaders/ads.f') === null)
    {
        fallbackRedirect();
        return;
    }

    let orthoProjMatrix = glMatrix.mat4.create();
    glMatrix.mat4.ortho(orthoProjMatrix, -5, 5, -5, 5, 0.1, 100);

    shadowShader = new ShadowShader(gl, orthoProjMatrix);
    if(await shadowShader.InitializeFromURL("shaders/shadow.v", "shaders/shadow.f") === null)
    {
        fallbackRedirect();
        return;
    }

    adsShader.Use();

    let sphere = new Model();
    await sphere.LoadModel("models/uv_sphere.obj", "textures/grid.png", "textures/spec.png", "textures/norm.png", gl);
    glMatrix.mat4.translate(sphere.transformMatrix, sphere.transformMatrix, [0,0.75,0]);
    let ground = new Model();
    await ground.LoadModel("models/floor.obj", "textures/grid.png", "textures/spec.png", "textures/norm.png", gl);

    models.push(sphere, ground);

    viewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -3.0]);

    directionalLight = new DirectionalLight([0.249136, 0.830454, 0.498272], [1.0, 1.0, 1.0], 1024, gl);

    gl.uniform3fv(adsShader.uniforms.sunDirection, directionalLight.direction);
    gl.uniform3fv(adsShader.uniforms.sunColor, directionalLight.color);

    lastTimeStamp = performance.now();

    adsShader.StopUsing();

    render(0);
}

window.onload = main;