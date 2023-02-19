'use strict';



class Shader
{
    program;
    attributes;
    uniforms;
    gl;

    constructor(glContext)
    {
        this.gl = glContext;
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
            modelViewMatrix: this.gl.getUniformLocation(this.program, "uModelViewMatrix"),
            viewMatrix: this.gl.getUniformLocation(this.program, "uViewMatrix"),
            normalMatrix: this.gl.getUniformLocation(this.program, "uNormalMatrix"),
            projectionMatrix: this.gl.getUniformLocation(this.program, "uProjectionMatrix"),
            diffuseTexture: this.gl.getUniformLocation(this.program, "uDiffuseTexture"),
            specularTexture: this.gl.getUniformLocation(this.program, "uSpecularTexture"),
            normalTexture: this.gl.getUniformLocation(this.program, "uNormalTexture"),
            ambientFactor: this.gl.getUniformLocation(this.program, "uAmbientFactor"),
            sunDirection: this.gl.getUniformLocation(this.program, "uSunDirection"),
            sunColor: this.gl.getUniformLocation(this.program, "uSunColor")
        };
    }

    Use()
    {
        this.gl.useProgram(this.program);
        this.gl.enableVertexAttribArray(adsShader.attributes.vertexBitangent);
        this.gl.enableVertexAttribArray(adsShader.attributes.vertexPosition);
        this.gl.enableVertexAttribArray(adsShader.attributes.vertexTextureCoord);
        this.gl.enableVertexAttribArray(adsShader.attributes.vertexNormal);
        this.gl.enableVertexAttribArray(adsShader.attributes.vertexTangent);
    }

    StopUsing()
    {
        this.gl.disableVertexAttribArray(adsShader.attributes.vertexBitangent);
        this.gl.disableVertexAttribArray(adsShader.attributes.vertexPosition);
        this.gl.disableVertexAttribArray(adsShader.attributes.vertexTextureCoord);
        this.gl.disableVertexAttribArray(adsShader.attributes.vertexNormal);
        this.gl.disableVertexAttribArray(adsShader.attributes.vertexTangent);
    }

}

class ShadowShader extends Shader
{
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
    }

    Use()
    {
        this.gl.useProgram(this.program);
        this.gl.enableVertexAttribArray(adsShader.attributes.vertexPosition);
    }

    StopUsing()
    {
        this.gl.disableVertexAttribArray(adsShader.attributes.vertexPosition);
    }
}