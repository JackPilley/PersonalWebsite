//From https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
function loadTexture(url, glContext)
{
    const gl = glContext;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    //Load a temporary single pixel image to use while the browser loads the actual image
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));

    const image = new Image();
    //image.
    image.onload = async () => {
        //WebGL needs images to be flipped along the Y axis
        const bitmap = await createImageBitmap(image, {imageOrientation:"flipY"});

        //Save the currently bound texture, so we can rebind it at the end, to be clean.
        const oldTexture = gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);

        function isPowerOf2(val){
            return (val & (val-1)) === 0;
        }

        if(isPowerOf2(image.width) && isPowerOf2(image.height))
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        else
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        gl.bindTexture(gl.TEXTURE_2D, oldTexture);
    }

    image.src = url;

    return texture;
}

async function loadModel(modelURL, textureURL, glContext)
{
    const texture = loadTexture(textureURL, glContext);

    const gl = glContext;

    let positions = [];
    let textureCoords = [];

    // Interleaved vertex data
    let vertices = [];

    const modelResponse = await fetch(modelURL);
    if(!modelResponse.ok) return null;

    const modelText = await modelResponse.text();

    const modelLines = modelText.split("\n");

    let vertexCount = 0;

    for(let l of modelLines)
    {
        //Skip comments
        if(l.charAt(0) === "#") continue;

        const parts = l.split(" ");
        if(parts.length === 0) continue;

        const type = parts[0];

        if(type === "v")
        {
            positions.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
        }
        else if(type === "vt")
        {
            textureCoords.push([Number(parts[1]), Number(parts[2])]);
        }
        else if(type === "f")
        {
            // Individual vertex
            const indsA = parts[1].split("/");
            const indsB = parts[2].split("/");
            const indsC = parts[3].split("/");

            const pointA = positions[indsA[0] - 1];
            const pointB = positions[indsB[0] - 1];
            const pointC = positions[indsC[0] - 1];

            const texA = textureCoords[indsA[1] - 1];
            const texB = textureCoords[indsB[1] - 1];
            const texC = textureCoords[indsC[1] - 1];

            vertices.push(pointA[0]);
            vertices.push(pointA[1]);
            vertices.push(pointA[2]);

            vertices.push(texA[0]);
            vertices.push(texA[1]);

            vertices.push(pointB[0]);
            vertices.push(pointB[1]);
            vertices.push(pointB[2]);

            vertices.push(texB[0]);
            vertices.push(texB[1]);

            vertices.push(pointC[0]);
            vertices.push(pointC[1]);
            vertices.push(pointC[2]);

            vertices.push(texC[0]);
            vertices.push(texC[1]);

            vertexCount += 3;
        }
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positionsF32 = new Float32Array(vertices);

    gl.bufferData(gl.ARRAY_BUFFER, positionsF32, gl.STATIC_DRAW);



    return {
        buffer: positionBuffer,
        texture,
        size: vertexCount,
        stride: positionsF32.BYTES_PER_ELEMENT * 5,
        posOffset: 0,
        texOffset: positionsF32.BYTES_PER_ELEMENT * 3
    };
}

function drawModel(model, shader, glContext)
{
    const gl = glContext;

    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffer);
    gl.vertexAttribPointer(
        shader.attributes.vertexPosition,
        3,
        gl.FLOAT,
        false,
        model.stride,
        model.posOffset
    );

    gl.vertexAttribPointer(
        shader.attributes.vertexTextureCoord,
        2,
        gl.FLOAT,
        false,
        model.stride,
        model.texOffset
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, model.texture);
    gl.uniform1i(shader.uniforms.diffuseTexture, 0);

    gl.drawArrays(gl.TRIANGLES, 0, model.size);
}