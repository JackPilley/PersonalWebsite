'use strict';

class Shader
{
    program;
    attributes;
    uniforms;
    projectionMatrix;
    gl;

    constructor(glContext, projectionMatrix)
    {
        this.gl = glContext;
        this.projectionMatrix = projectionMatrix;
    }

    /**
     * Compile a shader of the given type with the given source.
     * @param type
     * @param src
     * @returns {WebGLShader|null}
     */
    CompileShader(type, src)
    {
        const gl = this.gl;
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
    LoadShaderProgram(vertSrc, fragSrc)
    {
        const gl = this.gl;
        const vertShader = this.CompileShader(gl.VERTEX_SHADER, vertSrc);
        const fragShader = this.CompileShader(gl.FRAGMENT_SHADER, fragSrc);

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
            console.log(`Failed to link shader program: ${gl.getProgramInfoLog(program)}`);
            return null;
        }

        return program;
    }

    /**
     * Compiles and loads a shader with sources from the given urls
     * @param vertUrl
     * @param fragUrl
     * @returns {Promise<WebGLProgram|null>}
     */
    async LoadRemoteShaderProgram(vertUrl, fragUrl)
    {
        const results = await Promise.all([fetch(vertUrl), fetch(fragUrl)]);

        //Load shader source
        const vertexResponse = results[0];
        const fragmentResponse = results[1];

        if(!vertexResponse.ok || !fragmentResponse.ok)
        {
            return null;
        }

        const vertexText = await vertexResponse.text();
        const fragmentText = await fragmentResponse.text();

        //Compile shader
        return this.LoadShaderProgram(vertexText, fragmentText);
    }

}

class ADSShader extends Shader
{
    async InitializeFromURL(vertUrl, fragUrl)
    {
        this.program = await this.LoadRemoteShaderProgram(vertUrl, fragUrl);
        if(this.program === null) return null;

        this.attributes = {
            vertexPosition: this.gl.getAttribLocation(this.program, "aPosition"),
            vertexTextureCoord: this.gl.getAttribLocation(this.program, "aTextureCoord"),
            vertexNormal: this.gl.getAttribLocation(this.program, "aNormal"),
            vertexTangent: this.gl.getAttribLocation(this.program, "aTangent"),
            vertexBitangent: this.gl.getAttribLocation(this.program, "aBitanget")
        };

        this.uniforms = {
            modelMatrix: this.gl.getUniformLocation(this.program, "uModelMatrix"),
            viewMatrix: this.gl.getUniformLocation(this.program, "uViewMatrix"),
            normalMatrix: this.gl.getUniformLocation(this.program, "uNormalMatrix"),
            projectionMatrix: this.gl.getUniformLocation(this.program, "uProjectionMatrix"),
            diffuseTexture: this.gl.getUniformLocation(this.program, "uDiffuseTexture"),
            specularTexture: this.gl.getUniformLocation(this.program, "uSpecularTexture"),
            normalTexture: this.gl.getUniformLocation(this.program, "uNormalTexture"),
            ambientFactor: this.gl.getUniformLocation(this.program, "uAmbientFactor"),
            sunDirection: this.gl.getUniformLocation(this.program, "uSunDirection"),
            sunColor: this.gl.getUniformLocation(this.program, "uSunColor"),
            lightMatrix: this.gl.getUniformLocation(this.program, "uLightMatrix"),
            shadowMap: this.gl.getUniformLocation(this.program, "uShadowMap")
        };

        this.gl.useProgram(this.program);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
    }

    /**
     * Set the context state to be what the program requires:
     * - Sets this program to be the current active program
     * - Enables vertex attribute arrays
     */
    Use()
    {
        this.gl.useProgram(this.program);
        this.gl.enableVertexAttribArray(adsShader.attributes.vertexBitangent);
        this.gl.enableVertexAttribArray(adsShader.attributes.vertexPosition);
        this.gl.enableVertexAttribArray(adsShader.attributes.vertexTextureCoord);
        this.gl.enableVertexAttribArray(adsShader.attributes.vertexNormal);
        this.gl.enableVertexAttribArray(adsShader.attributes.vertexTangent);
    }

    /**
     * Disables the vertex attribute arrays used by this shader
     */
    StopUsing()
    {
        this.gl.disableVertexAttribArray(adsShader.attributes.vertexBitangent);
        this.gl.disableVertexAttribArray(adsShader.attributes.vertexPosition);
        this.gl.disableVertexAttribArray(adsShader.attributes.vertexTextureCoord);
        this.gl.disableVertexAttribArray(adsShader.attributes.vertexNormal);
        this.gl.disableVertexAttribArray(adsShader.attributes.vertexTangent);
    }

    /**
     * Draw the given model using this shader program.
     * Make sure this is the current active program (by calling Use()) before trying to draw
     */
    DrawModel(model, viewMatrix, lightMatrix)
    {
        const gl = this.gl;

        //Set attribute pointers
        gl.bindBuffer(gl.ARRAY_BUFFER, model.dataBuffer);
        gl.vertexAttribPointer(this.attributes.vertexPosition, 3, gl.FLOAT, false, model.stride, model.posOffset);

        gl.vertexAttribPointer(this.attributes.vertexTextureCoord, 2, gl.FLOAT, false, model.stride, model.texOffset);

        gl.vertexAttribPointer(this.attributes.vertexNormal, 3, gl.FLOAT, false, model.stride, model.normOffset);

        gl.vertexAttribPointer(this.attributes.vertexTangent, 3, gl.FLOAT, false, model.stride, model.tangentOffset);

        gl.vertexAttribPointer(this.attributes.vertexBitangent, 3, gl.FLOAT, false, model.stride, model.bitangentOffset);

        //Set diffuse texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, model.diffuseTexture);
        gl.uniform1i(this.uniforms.diffuseTexture, 0);

        //Set specular texture
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, model.specularTexture);
        gl.uniform1i(this.uniforms.specularTexture, 1);

        //Set normal texture
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, model.normalTexture);
        gl.uniform1i(this.uniforms.normalTexture, 2);

        gl.uniform1f(this.uniforms.ambientFactor, 0.5);

        //Multiply the model's transform and the view matrix
        let modelViewMatrix = glMatrix.mat4.create();
        glMatrix.mat4.multiply(modelViewMatrix, modelViewMatrix, viewMatrix);
        glMatrix.mat4.multiply(modelViewMatrix, modelViewMatrix, model.transformMatrix);

        //Use the model view matrix to generate the normal transform matrix
        let normalMatrix = glMatrix.mat3.create();
        glMatrix.mat3.normalFromMat4(normalMatrix, modelViewMatrix);

        gl.uniformMatrix4fv(this.uniforms.modelMatrix, false, model.transformMatrix);
        gl.uniformMatrix3fv(this.uniforms.normalMatrix, false, normalMatrix);
        gl.uniformMatrix4fv(this.uniforms.lightMatrix, false, lightMatrix);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
        gl.drawElements(gl.TRIANGLES, model.indicesCount, gl.UNSIGNED_SHORT, 0);
    }
}

class ShadowShader extends Shader
{
    shadowMap;
    resolution;
    frameBuffer;

    constructor (glContext, projectionMatrix, resolution)
    {
        super(glContext, projectionMatrix);

        this.shadowMap = this.gl.createTexture();
        this.resolution = resolution;
        this.gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, this.resolution, this.resolution, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.frameBuffer = gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
        this.gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowMap, 0);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    async InitializeFromURL(vertUrl, fragUrl)
    {
        this.program = await this.LoadRemoteShaderProgram(vertUrl, fragUrl);
        if(this.program === null) return null;

        this.attributes = {
            vertexPosition: this.gl.getAttribLocation(this.program, "aPosition")
        };
        this.uniforms = {
            modelViewMatrix: this.gl.getUniformLocation(this.program, "uModelViewMatrix"),
            projectionMatrix: this.gl.getUniformLocation(this.program, "uProjectionMatrix")
        };

        this.gl.useProgram(this.program);

        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
    }

    /**
     * Set the context state to be what the program requires:
     * - Sets this program to be the current active program
     * - Enables vertex attribute arrays
     */
    Use()
    {
        this.gl.useProgram(this.program);
        this.gl.enableVertexAttribArray(this.attributes.vertexPosition);
    }

    /**
     * Disables the vertex attribute arrays used by this shader
     */
    StopUsing()
    {
        this.gl.disableVertexAttribArray(this.attributes.vertexPosition);
    }

    /**
     * Draw the given model using this shader program.
     * Make sure this is the current active program (by calling Use()) before trying to draw
     */
    DrawModel(model, viewMatrix)
    {
        const gl = this.gl;

        //Set attribute pointers
        gl.bindBuffer(gl.ARRAY_BUFFER, model.dataBuffer);
        gl.vertexAttribPointer(this.attributes.vertexPosition, 3, gl.FLOAT, false, model.stride, model.posOffset);

        //Multiply the model's transform and the view matrix
        let modelViewMatrix = glMatrix.mat4.create();
        glMatrix.mat4.multiply(modelViewMatrix, modelViewMatrix, viewMatrix);
        glMatrix.mat4.multiply(modelViewMatrix, modelViewMatrix, model.transformMatrix);

        gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, modelViewMatrix);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
        gl.drawElements(gl.TRIANGLES, model.indicesCount, gl.UNSIGNED_SHORT, 0);
    }
}
