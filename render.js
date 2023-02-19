"use strict";

let canvas;
let gl;
let adsShader;
let shadowShader;

let projectionMatrix;
let viewMatrix;

let models = [];
let directionalLight = {
    direction: new Float32Array([0.249136, 0.830454, 0.498272]),
    color: new Float32Array([1.0, 1.0, 1.0]),
    shadowMap: null,
    shadowRes: 1024,
    viewMatrix: glMatrix.mat4.create()
}

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
        glMatrix.mat4.perspective(projectionMatrix,
            80*Math.PI/180,
            gl.canvas.clientWidth/gl.canvas.clientHeight,
            0.1, 100);
        gl.uniformMatrix4fv(adsShader.uniforms.projectionMatrix, false, projectionMatrix);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);

    //glMatrix.mat4.rotateX(model.transformMatrix, model.transformMatrix, 0.001 * delta);

    viewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.rotateX(viewMatrix, viewMatrix, 0.5);
    glMatrix.mat4.translate(viewMatrix, viewMatrix, [0.0, -2.0, -3.0]);
    glMatrix.mat4.rotateY(viewMatrix, viewMatrix, 0.0005 * timeStamp);

    gl.uniformMatrix4fv(adsShader.uniforms.viewMatrix, false, directionalLight.viewMatrix);

    adsShader.Use();

    for(const model of models) {
        drawModel(model, directionalLight.viewMatrix, adsShader, gl);
    }

    adsShader.StopUsing();

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
    gl.clearColor(0,0.4,0.6,1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    //Find attribute and uniform locations
    adsShader = new ADSShader(gl);
    if(await adsShader.InitializeFromURL('shaders/model.v', 'shaders/ads.f') === null)
    {
        fallbackRedirect();
        return;
    }

    shadowShader = new ShadowShader(gl);
    if(await shadowShader.InitializeFromURL("shaders/shadow.v", "shaders/shadow.f") === null)
    {
        fallbackRedirect();
        return;
    }

    gl.useProgram(adsShader.program);

    /*let model = await loadModel("models/uv_sphere.obj", "textures/grid.png", "textures/spec.png", "textures/norm.png", gl);
    models.push(model);
    model = await loadModel("models/floor.obj", "textures/grid.png", "textures/spec.png", "textures/norm.png", gl);
    glMatrix.mat4.translate(model.transformMatrix, model.transformMatrix, [0,-0.5,0]);
    models.push(model);*/

    let sphere = new Model();
    await sphere.LoadModel("models/uv_sphere.obj", "textures/grid.png", "textures/spec.png", "textures/norm.png", gl);
    let ground = new Model();
    await ground.LoadModel("models/floor.obj", "textures/grid.png", "textures/spec.png", "textures/norm.png", gl);

    models.push(sphere, ground);

    projectionMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projectionMatrix,
        75*Math.PI/180,
        gl.canvas.clientWidth/gl.canvas.clientHeight,
        0.1, 100);

    gl.uniformMatrix4fv(adsShader.uniforms.projectionMatrix, false, projectionMatrix);

    viewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -3.0]);

    let lightLookDir = glMatrix.vec3.create();
    glMatrix.vec3.multiply(lightLookDir, directionalLight.direction, [5,5,5]);
    glMatrix.mat4.lookAt(directionalLight.viewMatrix, lightLookDir, [0,0,0], [0,1,0]);

    gl.uniform3fv(adsShader.uniforms.sunDirection, directionalLight.direction);
    gl.uniform3fv(adsShader.uniforms.sunColor, directionalLight.color);

    lastTimeStamp = performance.now();

    render(0);
}

window.onload = main;