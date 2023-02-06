let canvas;
let gl;
let adsShader;
let projectionMatrix;
let viewMatrix;

let model;

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

    const modelViewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -3.0]);
    glMatrix.mat4.rotateY(modelViewMatrix, modelViewMatrix, 0.001 * timeStamp);
    glMatrix.mat4.rotateZ(modelViewMatrix, modelViewMatrix, 0.002 * timeStamp);
    gl.uniformMatrix4fv(adsShader.uniforms.modelViewMatrix, false, modelViewMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, 12);

    window.requestAnimationFrame(render)
}

async function main()
{
    canvas = document.querySelector("#canvas");
    gl = canvas.getContext("webgl2");
    //Just try everything. Realistically, we only need to check webgl2 and webgl
    if(gl === null) gl = canvas.getContext("webgl");
    if(gl === null){
        fallbackRedirect();
        return;
    }

    gl.canvas.width = gl.canvas.clientWidth;
    gl.canvas.height = gl.canvas.clientHeight;

    gl.viewport(0,0, gl.canvas.clientWidth, gl.canvas.clientHeight);
    gl.clearColor(0,0.4,0.6,1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    const vertexResponse = await fetch('model.v');
    const fragmentResponse = await fetch('ads.f');

    if(!vertexResponse.ok || !fragmentResponse.ok)
    {
        fallbackRedirect();
        return;
    }

    const vertexText = await vertexResponse.text();
    const fragmentText = await fragmentResponse.text();

    const adsProgram = loadShaderProgram(vertexText, fragmentText);

    if(adsProgram === null)
    {
        fallbackRedirect();
        return;
    }

    adsShader = {
        program: adsProgram,
        attributes: {
            vertexPosition: gl.getAttribLocation(adsProgram, "aPosition"),
            vertexTextureCoord: gl.getAttribLocation(adsProgram, "aTextureCoord")
        },

        uniforms: {
            modelViewMatrix: gl.getUniformLocation(adsProgram, "uModelView"),
            projectionMatrix: gl.getUniformLocation(adsProgram, "uProjection")
        }
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = await loadModel("triangle.obj", "", gl);

    model = positions;

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    projectionMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projectionMatrix,
        80*Math.PI/180,
        gl.canvas.clientWidth/gl.canvas.clientHeight,
        0.1, 100);

    const modelViewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -3.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(
        adsShader.attributes.vertexPosition,
        3,
        gl.FLOAT,
        false,
        positions.BYTES_PER_ELEMENT * 5,
        0
    );

    gl.vertexAttribPointer(
        adsShader.attributes.vertexTextureCoord,
        2,
        gl.FLOAT,
        false,
        positions.BYTES_PER_ELEMENT * 5,
        positions.BYTES_PER_ELEMENT * 3
    );

    gl.enableVertexAttribArray(adsShader.attributes.vertexPosition);
    gl.enableVertexAttribArray(adsShader.attributes.vertexTextureCoord);

    gl.useProgram(adsShader.program);

    gl.uniformMatrix4fv(adsShader.uniforms.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(adsShader.uniforms.modelViewMatrix, false, modelViewMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, 12);

    render(0);
}

window.onload = main;