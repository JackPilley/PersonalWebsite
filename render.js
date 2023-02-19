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
 * Compile a shader of the given type with the given source.
 * @param type
 * @param src
 * @returns {WebGLShader|null}
 */
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

/**
 * Compile and link a shader program with the given source
 * @param vertSrc
 * @param fragSrc
 * @returns {null|WebGLProgram}
 */
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

    if(!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
        alert(`Failed to link shader program: ${gl.getProgramInfoLog(program)}`);
        return null;
    }

    return program;
}

async function loadRemoteShaderProgram(vertUrl, fragUrl)
{
    //Load shader source
    const vertexResponse = await fetch(vertUrl);
    const fragmentResponse = await fetch(fragUrl);

    if(!vertexResponse.ok || !fragmentResponse.ok)
    {
        fallbackRedirect();
        return;
    }

    const vertexText = await vertexResponse.text();
    const fragmentText = await fragmentResponse.text();

    //Compile shader
    return loadShaderProgram(vertexText, fragmentText);
}

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

    gl.useProgram(adsShader.program);

    gl.enableVertexAttribArray(adsShader.attributes.vertexPosition);
    gl.enableVertexAttribArray(adsShader.attributes.vertexTextureCoord);
    gl.enableVertexAttribArray(adsShader.attributes.vertexNormal);
    gl.enableVertexAttribArray(adsShader.attributes.vertexTangent);
    gl.enableVertexAttribArray(adsShader.attributes.vertexBitangent);

    for(const model of models) {
        drawModel(model, directionalLight.viewMatrix, adsShader, gl);
    }

    gl.disableVertexAttribArray(adsShader.attributes.vertexPosition);
    gl.disableVertexAttribArray(adsShader.attributes.vertexTextureCoord);
    gl.disableVertexAttribArray(adsShader.attributes.vertexNormal);
    gl.disableVertexAttribArray(adsShader.attributes.vertexTangent);
    gl.disableVertexAttribArray(adsShader.attributes.vertexBitangent);

    window.requestAnimationFrame(render)
}



async function main()
{
    canvas = document.querySelector("#canvas");
    gl = canvas.getContext("webgl2");

    //Get the GL context
    if(gl === null) gl = canvas.getContext("webgl");
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

    //Compile shader
    const adsProgram = await loadRemoteShaderProgram('shaders/model.v', 'shaders/ads.f');

    if(adsProgram === null)
    {
        fallbackRedirect();
        return;
    }

    //Find attribute and uniform locations
    adsShader = {
        program: adsProgram,
        attributes: {
            vertexPosition: gl.getAttribLocation(adsProgram, "aPosition"),
            vertexTextureCoord: gl.getAttribLocation(adsProgram, "aTextureCoord"),
            vertexNormal: gl.getAttribLocation(adsProgram, "aNormal"),
            vertexTangent: gl.getAttribLocation(adsProgram, "aTangent"),
            vertexBitangent: gl.getAttribLocation(adsProgram, "aBitanget")
        },

        uniforms: {
            modelViewMatrix: gl.getUniformLocation(adsProgram, "uModelViewMatrix"),
            viewMatrix: gl.getUniformLocation(adsProgram, "uViewMatrix"),
            normalMatrix: gl.getUniformLocation(adsProgram, "uNormalMatrix"),
            projectionMatrix: gl.getUniformLocation(adsProgram, "uProjectionMatrix"),
            diffuseTexture: gl.getUniformLocation(adsProgram, "uDiffuseTexture"),
            specularTexture: gl.getUniformLocation(adsProgram, "uSpecularTexture"),
            normalTexture: gl.getUniformLocation(adsProgram, "uNormalTexture"),
            ambientFactor: gl.getUniformLocation(adsProgram, "uAmbientFactor"),
            sunDirection: gl.getUniformLocation(adsProgram, "uSunDirection"),
            sunColor: gl.getUniformLocation(adsProgram, "uSunColor")
        }
    }

    const shadowProgram = await loadRemoteShaderProgram("shaders/shadow.v", "shaders/shadow.f");

    if(shadowProgram === null)
    {
        fallbackRedirect();
        return;
    }

    shadowShader = {
        program: shadowProgram,
        attributes: {
            vertexPosition: gl.getAttribLocation(shadowProgram, "aPosition")
        },
        uniforms: {
            modelViewMatrix: gl.getUniformLocation(shadowProgram, "uModelViewMatrix"),
            projectionMatrix: gl.getUniformLocation(shadowProgram, "uProjectionMatrix")
        }
    }

    gl.useProgram(adsShader.program);

    let model = await loadModel("models/uv_sphere.obj", "textures/grid.png", "textures/spec.png", "textures/norm.png", gl);
    models.push(model);
    model = await loadModel("models/floor.obj", "textures/grid.png", "textures/spec.png", "textures/norm.png", gl);
    glMatrix.mat4.translate(model.transformMatrix, model.transformMatrix, [0,-0.5,0]);
    models.push(model);

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