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
            40*Math.PI/180,
            gl.canvas.clientWidth/gl.canvas.clientHeight,
            0.1, 100);
        adsShader.Use();
        gl.uniformMatrix4fv(adsShader.uniforms.projectionMatrix, false, adsShader.projectionMatrix);
        adsShader.StopUsing();
    }

    viewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.lookAt(viewMatrix, [0.0, 2.0, 4.0], [0,0.3,0], [0,1,0]);
    glMatrix.mat4.rotateY(viewMatrix, viewMatrix, 0.0005 * timeStamp);

    ShadowPass();

    ADSPass();

    window.requestAnimationFrame(render);
}

function ShadowPass()
{
    shadowShader.Use();

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowShader.frameBuffer);
    gl.viewport(0,0,shadowShader.resolution,shadowShader.resolution);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(shadowShader.uniforms.viewMatrix, false, directionalLight.viewMatrix);

    for(const model of models) {
        shadowShader.DrawModel(model, directionalLight.viewMatrix);
    }

    shadowShader.StopUsing();
}

function ADSPass()
{
    adsShader.Use();

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0,0, gl.canvas.clientWidth, gl.canvas.clientHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(adsShader.uniforms.viewMatrix, false, viewMatrix);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, shadowShader.shadowMap);
    gl.uniform1i(adsShader.uniforms.shadowMap, 3);

    let lightMatrix = glMatrix.mat4.create();
    glMatrix.mat4.multiply(lightMatrix, shadowShader.projectionMatrix, directionalLight.viewMatrix);

    for(const model of models) {
        adsShader.DrawModel(model, viewMatrix, lightMatrix);
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
    gl.clearColor(0.3,0.6,0.9,1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    let perspectiveProjMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(perspectiveProjMatrix, 40*Math.PI/180, gl.canvas.clientWidth/gl.canvas.clientHeight, 0.1, 100);

    let orthoProjMatrix = glMatrix.mat4.create();
    glMatrix.mat4.ortho(orthoProjMatrix, -5, 5, -5, 5, 0.1, 10);

    adsShader = new ADSShader(gl, perspectiveProjMatrix);
    shadowShader = new ShadowShader(gl, orthoProjMatrix, 1024);
    let house = new Model();
    //let ground = new Model();
    let island = new Model();

    //Request all resources at once then await the results
    let adsInitResult = adsShader.InitializeFromURL('shaders/model.v', 'shaders/ads.f');
    let shadowInitResult = shadowShader.InitializeFromURL("shaders/shadow.v", "shaders/shadow.f");
    let spherePromise = house.LoadModel("models/house.obj", "textures/house_diffuse.jpg", "textures/house_spec.png", "textures/house_norm.jpg", gl);
    //let groundPromise = ground.LoadModel("models/floor.obj", "textures/grid.png", "textures/spec.png", "textures/norm.png", gl);

    let islandPromise = island.LoadModel("models/floating_island.obj", "textures/island_diffuse.jpg", "textures/island_spec.png", "textures/island_norm.jpg", gl);

    if(await adsInitResult === null || await shadowInitResult === null || !await islandPromise || !await spherePromise)
    {
        fallbackRedirect();
        return;
    }

    //glMatrix.mat4.translate(sphere.transformMatrix, sphere.transformMatrix, [0,1,0]);
    //glMatrix.mat4.scale(ground.transformMatrix, ground.transformMatrix, [3,1,3]);

    models.push(house);
    models.push(island);

    viewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -3.0]);

    let lightDir = glMatrix.vec3.create();
    glMatrix.vec3.normalize(lightDir, [-0.3, 0.4, -0.3]);

    directionalLight = new DirectionalLight(lightDir, [1.0, 1.0, 1.0]);

    adsShader.Use();

    gl.uniform3fv(adsShader.uniforms.sunDirection, directionalLight.direction);
    gl.uniform3fv(adsShader.uniforms.sunColor, directionalLight.color);

    //No idea why, but the shadows don't work in chromium even though I'm using idiomatic webgl as far as I can tell
    //if(!!!window.chrome)
        gl.uniform1i(adsShader.uniforms.useShadows, 1);

    adsShader.StopUsing();

    lastTimeStamp = performance.now();

    render(0);
}

window.onload = main;