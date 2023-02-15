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
        const bitmap = await createImageBitmap(image, {imageOrientation:"flipY", premultiplyAlpha:"none"});

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

async function loadModel(modelURL, diffuseURL, specularURL, normalURL, glContext)
{
    const diffuse = loadTexture(diffuseURL, glContext);
    const specular = loadTexture(specularURL, glContext);
    const normal = loadTexture(normalURL, glContext);

    const gl = glContext;

    let positions = [];
    let normals = [];
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
        else if(type === "vn")
        {
            normals.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
        }
        else if(type === "vt")
        {
            textureCoords.push([Number(parts[1]), Number(parts[2])]);
        }
        else if(type === "f")
        {
            // Split the indices of the individual vertices. The format is pos/tex/norm
            const indsA = parts[1].split("/");
            const indsB = parts[2].split("/");
            const indsC = parts[3].split("/");

            // Subtract 1 because obj uses 1 based indexing and JS uses 0 based indexing
            //Get the positions
            const pointA = positions[indsA[0] - 1];
            const pointB = positions[indsB[0] - 1];
            const pointC = positions[indsC[0] - 1];

            //Get the normal vectors
            const normA = normals[indsA[2] - 1];
            const normB = normals[indsB[2] - 1];
            const normC = normals[indsC[2] - 1];

            //Get the texture coordinates
            const texA = textureCoords[indsA[1] - 1];
            const texB = textureCoords[indsB[1] - 1];
            const texC = textureCoords[indsC[1] - 1];

            //Calculate tangents
            let edge1 = [0,0,0];
            let edge2 = [0,0,0];
            let uvDelta1 = [0,0];
            let uvDelta2 = [0,0];

            edge1[0] = pointB[0] - pointA[0];
            edge1[1] = pointB[1] - pointA[1];
            edge1[2] = pointB[2] - pointA[2];

            edge2[0] = pointC[0] - pointA[0];
            edge2[1] = pointC[1] - pointA[1];
            edge2[2] = pointC[2] - pointA[2];

            uvDelta1[0] = texB[0] - texA[0];
            uvDelta1[1] = texB[1] - texA[1];

            uvDelta2[0] = texC[0] - texA[0];
            uvDelta2[1] = texC[1] - texA[1];

            const f = 1.0/(uvDelta1[0] * uvDelta2[1] - uvDelta2[0] * uvDelta1[1]);

            let tangent = [0,0,0];
            tangent[0] = f * (uvDelta2[1] * edge1[0] - uvDelta1[1] * edge2[0]);
            tangent[1] = f * (uvDelta2[1] * edge1[1] - uvDelta1[1] * edge2[1]);
            tangent[2] = f * (uvDelta2[1] * edge1[2] - uvDelta1[1] * edge2[2]);

            let bitangent = [0,0,0];
            bitangent[0] = f * (-uvDelta2[0] * edge1[0] + uvDelta1[0] * edge2[0]);
            bitangent[1] = f * (-uvDelta2[0] * edge1[1] + uvDelta1[0] * edge2[1]);
            bitangent[2] = f * (-uvDelta2[0] * edge1[2] + uvDelta1[0] * edge2[2]);

            //Push the interleaved data for the face

            //Position A
            vertices.push(pointA[0]);
            vertices.push(pointA[1]);
            vertices.push(pointA[2]);

            //Texture A
            vertices.push(texA[0]);
            vertices.push(texA[1]);

            //Normal A
            vertices.push(normA[0]);
            vertices.push(normA[1]);
            vertices.push(normA[2]);

            //Tangent and Bitangent, which is the same for all vertices in the face
            vertices.push(tangent[0]);
            vertices.push(tangent[1]);
            vertices.push(tangent[2]);
            vertices.push(bitangent[0]);
            vertices.push(bitangent[1]);
            vertices.push(bitangent[2]);

            //Position B
            vertices.push(pointB[0]);
            vertices.push(pointB[1]);
            vertices.push(pointB[2]);

            //Texture B
            vertices.push(texB[0]);
            vertices.push(texB[1]);

            //Normal B
            vertices.push(normB[0]);
            vertices.push(normB[1]);
            vertices.push(normB[2]);

            //Tangent and Bitangent, which is the same for all vertices in the face
            vertices.push(tangent[0]);
            vertices.push(tangent[1]);
            vertices.push(tangent[2]);
            vertices.push(bitangent[0]);
            vertices.push(bitangent[1]);
            vertices.push(bitangent[2]);

            //Position C
            vertices.push(pointC[0]);
            vertices.push(pointC[1]);
            vertices.push(pointC[2]);

            //Texture C
            vertices.push(texC[0]);
            vertices.push(texC[1]);

            //Normal C
            vertices.push(normC[0]);
            vertices.push(normC[1]);
            vertices.push(normC[2]);

            //Tangent and Bitangent, which is the same for all vertices in the face
            vertices.push(tangent[0]);
            vertices.push(tangent[1]);
            vertices.push(tangent[2]);
            vertices.push(bitangent[0]);
            vertices.push(bitangent[1]);
            vertices.push(bitangent[2]);

            vertexCount += 3;
        }
    }

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    const verticesF32 = new Float32Array(vertices);

    gl.bufferData(gl.ARRAY_BUFFER, verticesF32, gl.STATIC_DRAW);

    return {
        buffer: vertexBuffer,
        diffuse,
        specular,
        normal,
        size: vertexCount,
        transformMatrix: glMatrix.mat4.create(),
        stride: verticesF32.BYTES_PER_ELEMENT * 14,
        posOffset: 0,
        texOffset: verticesF32.BYTES_PER_ELEMENT * 3,
        normOffset: verticesF32.BYTES_PER_ELEMENT * 5,
        tangentOffset: verticesF32.BYTES_PER_ELEMENT * 8,
        bitangentOffset: verticesF32.BYTES_PER_ELEMENT * 11
    };
}

function drawModel(model, viewMatrix, shader, glContext)
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

    gl.vertexAttribPointer(
        shader.attributes.vertexNormal,
        3,
        gl.FLOAT,
        false,
        model.stride,
        model.normOffset
    );

    gl.vertexAttribPointer(
        shader.attributes.vertexTangent,
        3,
        gl.FLOAT,
        false,
        model.stride,
        model.tangentOffset
    );

    gl.vertexAttribPointer(
        shader.attributes.vertexBitangent,
        3,
        gl.FLOAT,
        false,
        model.stride,
        model.bitangentOffset
    );

    //Set diffuse texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, model.diffuse);
    gl.uniform1i(shader.uniforms.diffuseTexture, 0);

    //Set specular texture
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, model.specular);
    gl.uniform1i(shader.uniforms.specularTexture, 1);

    //Set normal texture
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, model.normal);
    gl.uniform1i(shader.uniforms.normalTexture, 2);

    gl.uniform1f(shader.uniforms.ambientFactor, 0.3);

    let modelViewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.multiply(modelViewMatrix, modelViewMatrix, viewMatrix);
    glMatrix.mat4.multiply(modelViewMatrix, modelViewMatrix, model.transformMatrix);

    let normalMatrix = glMatrix.mat3.create();
    glMatrix.mat3.normalFromMat4(normalMatrix, modelViewMatrix);

    gl.uniformMatrix4fv(shader.uniforms.modelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix3fv(shader.uniforms.normalMatrix, false, normalMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, model.size);
}