"use strict";

//Adapted from https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
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

class Model
{
    dataBuffer;
    indexBuffer;
    diffuseTexture;
    specularTexture;
    normalTexture;
    indicesCount;
    transformMatrix;
    stride;
    posOffset;
    texOffset;
    normOffset;
    tangentOffset;
    bitangentOffset;

    constructor()
    {
        this.transformMatrix = glMatrix.mat4.create();
    }

    async LoadModel(modelURL, diffuseURL, specularURL, normalURL, glContext)
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
        //Vertex indices
        let indices = [];
        //Map of position, texture coordinate, and normal vector combinations we've already seen
        //Used to determine vertex indices
        let vertexMap = new Map();

        const modelResponse = await fetch(modelURL);
        if(!modelResponse.ok) return null;

        const modelText = await modelResponse.text();

        const modelLines = modelText.split("\n");

        let indexCount = 0;

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

                //Calculate tangents and bitangents
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

                function pushData(part, point, tex, norm)
                {
                    indices.push(indexCount);
                    vertexMap.set(part, indexCount);
                    indexCount++;

                    //Position A
                    vertices.push(point[0], point[1], point[2]);
                    //Texture A
                    vertices.push(tex[0], tex[1]);
                    //Normal A
                    vertices.push(norm[0], norm[1], norm[2]);
                    //Tangent and Bitangent, which is the same for all vertices in the face
                    vertices.push(tangent[0], tangent[1], tangent[2]);
                    vertices.push(bitangent[0], bitangent[1], bitangent[2]);
                }

                //If we've not seen this combination of data before then add it to the array and map its index
                if(vertexMap.get(parts[1]) === undefined)
                {
                    pushData(parts[1], pointA, texA, normA);
                }
                //Otherwise get the index of the existing data
                else
                {
                    indices.push(vertexMap.get(parts[1]));
                }

                //If we've not seen this combination of data before then add it to the array and map its index
                if(vertexMap.get(parts[2]) === undefined)
                {
                    pushData(parts[2], pointB, texB, normB);
                }
                //Otherwise get the index of the existing data
                else
                {
                    indices.push(vertexMap.get(parts[2]));
                }

                //If we've not seen this combination of data before then add it to the array and map its index
                if(vertexMap.get(parts[3]) === undefined)
                {
                    pushData(parts[3], pointC, texC, normC);
                }
                //Otherwise get the index of the existing data
                else
                {
                    indices.push(vertexMap.get(parts[3]));
                }
            }
        }

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        const verticesF32 = new Float32Array(vertices);
        gl.bufferData(gl.ARRAY_BUFFER, verticesF32, gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        const indicesU16 = new Uint16Array(indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesU16, gl.STATIC_DRAW);

        this.dataBuffer = vertexBuffer;
        this.indexBuffer = indexBuffer;
        this.diffuseTexture = diffuse;
        this.specularTexture = specular;
        this.normalTexture = normal;
        this.indicesCount = indices.length;
        this.transformMatrix = glMatrix.mat4.create();
        this.stride = verticesF32.BYTES_PER_ELEMENT * 14;
        this.posOffset = 0;
        this.texOffset = verticesF32.BYTES_PER_ELEMENT * 3;
        this.normOffset = verticesF32.BYTES_PER_ELEMENT * 5;
        this.tangentOffset = verticesF32.BYTES_PER_ELEMENT * 8;
        this.bitangentOffset = verticesF32.BYTES_PER_ELEMENT * 11;
    }

}