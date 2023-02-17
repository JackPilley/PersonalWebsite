let canvas;
let gl;
let adsShader;
let projectionMatrix;
let viewMatrix;

let model;

let lastTimeStamp;


/**
 * Compile a shader of the given type with the given source.
 * @param type
 * @param src
 * @returns {WebGLShader|null}
 */
function loadShader(type, src)
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
    const vertShader = loadShader(gl.VERTEX_SHADER, vertSrc);
    const fragShader = loadShader(gl.FRAGMENT_SHADER, fragSrc);

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
    glMatrix.mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -3.0]);
    glMatrix.mat4.rotateY(viewMatrix, viewMatrix, 0.0005 * timeStamp);

    glMatrix.mat4.rotateZ(model.transformMatrix, model.transformMatrix, 0.001 * delta);

    gl.uniformMatrix4fv(adsShader.uniforms.viewMatrix, false, viewMatrix);

    drawModel(model, viewMatrix, adsShader, gl);

    window.requestAnimationFrame(render)
}

async function main()
{
    canvas = document.querySelector("#canvas");
    gl = canvas.getContext("webgl2");

    //Get the GL context
    if(gl === null) gl = canvas.getContext("webgl");
    if(gl === null){
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

    //Load shader source
    const vertexResponse = await fetch('shaders/model.v');
    const fragmentResponse = await fetch('shaders/ads.f');

    if(!vertexResponse.ok || !fragmentResponse.ok)
    {
        fallbackRedirect();
        return;
    }

    const vertexText = await vertexResponse.text();
    const fragmentText = await fragmentResponse.text();

    //Compile shader
    const adsProgram = loadShaderProgram(vertexText, fragmentText);

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

    gl.enableVertexAttribArray(adsShader.attributes.vertexPosition);
    gl.enableVertexAttribArray(adsShader.attributes.vertexTextureCoord);
    gl.enableVertexAttribArray(adsShader.attributes.vertexNormal);
    gl.enableVertexAttribArray(adsShader.attributes.vertexTangent);
    gl.enableVertexAttribArray(adsShader.attributes.vertexBitangent);

    gl.useProgram(adsShader.program);

    model = await loadModel("models/cube.obj", "textures/grid.png", "textures/spec.png", "textures/norm.png", gl);

    projectionMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projectionMatrix,
        75*Math.PI/180,
        gl.canvas.clientWidth/gl.canvas.clientHeight,
        0.1, 100);

    gl.uniformMatrix4fv(adsShader.uniforms.projectionMatrix, false, projectionMatrix);

    viewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -3.0]);

    gl.uniform4fv(adsShader.uniforms.sunDirection, new Float32Array([0.249136, 0.830454, 0.498272, 0.0]));
    gl.uniform3fv(adsShader.uniforms.sunColor, new Float32Array([1.0, 1.0, 1.0]));

    lastTimeStamp = performance.now();

    render(0);
}

window.onload = main;