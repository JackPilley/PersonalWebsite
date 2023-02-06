async function loadModel(modelURL, textureURL, glContext)
{
    const gl = glContext;

    let positions = [];
    let textureCoords = [];

    // Interleaved vertex data
    let vertices = [];

    const modelResponse = await fetch(modelURL);
    if(!modelResponse.ok) return null;

    const modelText = await modelResponse.text();

    const modelLines = modelText.split("\n");

    for(let l of modelLines)
    {
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
        }
    }

    return new Float32Array(vertices);
}