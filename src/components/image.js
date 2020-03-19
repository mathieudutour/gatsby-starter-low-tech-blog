/** This is pretty much https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-image/src/index.js but working without JS */
import React from "react"
import PropTypes from "prop-types"

const logDeprecationNotice = (prop, replacement) => {
  if (process.env.NODE_ENV === `production`) {
    return
  }

  console.log(
    `
    The "${prop}" prop is now deprecated and will be removed in the next major version
    of "gatsby-image".
    `
  )

  if (replacement) {
    console.log(`Please use ${replacement} instead of "${prop}".`)
  }
}

// Handle legacy props during their deprecation phase
const convertProps = props => {
  let convertedProps = { ...props }
  const { resolutions, sizes, critical } = convertedProps

  if (resolutions) {
    convertedProps.fixed = resolutions
    delete convertedProps.resolutions
  }
  if (sizes) {
    convertedProps.fluid = sizes
    delete convertedProps.sizes
  }

  if (critical) {
    logDeprecationNotice(`critical`, `the native "loading" attribute`)
    convertedProps.loading = `eager`
  }

  // convert fluid & fixed to arrays so we only have to work with arrays
  if (convertedProps.fluid) {
    convertedProps.fluid = groupByMedia([].concat(convertedProps.fluid))
  }
  if (convertedProps.fixed) {
    convertedProps.fixed = groupByMedia([].concat(convertedProps.fixed))
  }

  return convertedProps
}

// Return an array ordered by elements having a media prop, does not use
// native sort, as a stable sort is not guaranteed by all browsers/versions
function groupByMedia(imageVariants) {
  const withMedia = []
  const without = []
  imageVariants.forEach(variant =>
    (variant.media ? withMedia : without).push(variant)
  )

  if (without.length > 1 && process.env.NODE_ENV !== `production`) {
    console.warn(
      `We've found ${without.length} sources without a media property. They might be ignored by the browser, see: https://www.gatsbyjs.org/packages/gatsby-image/#art-directing-multiple-images`
    )
  }

  return [...withMedia, ...without]
}

function generateImageSources(imageVariants) {
  return imageVariants.map(({ src, srcSet, srcSetWebp, media, sizes }) => (
    <React.Fragment key={src}>
      {srcSetWebp && (
        <source
          type="image/webp"
          media={media}
          srcSet={srcSetWebp}
          sizes={sizes}
        />
      )}
      <source media={media} srcSet={srcSet} sizes={sizes} />
    </React.Fragment>
  ))
}

function generateTracedSVGSources(imageVariants) {
  return imageVariants.map(({ src, media, tracedSVG }) => (
    <source key={src} media={media} srcSet={tracedSVG} />
  ))
}

function generateBase64Sources(imageVariants) {
  return imageVariants.map(({ src, media, base64 }) => (
    <source key={src} media={media} srcSet={base64} />
  ))
}

// Earlier versions of gatsby-image during the 2.x cycle did not wrap
// the `Img` component in a `picture` element. This maintains compatibility
// until a breaking change can be introduced in the next major release
const Placeholder = ({
  src,
  imageVariants,
  generateSources,
  spreadProps,
  ariaHidden,
}) => {
  const baseImage = <Img src={src} {...spreadProps} ariaHidden={ariaHidden} />

  return imageVariants.length > 1 ? (
    <picture>
      {generateSources(imageVariants)}
      {baseImage}
    </picture>
  ) : (
    baseImage
  )
}

const Img = React.forwardRef((props, ref) => {
  const {
    sizes,
    srcSet,
    src,
    style,
    loading,
    draggable,
    // `ariaHidden`props is used to exclude placeholders from the accessibility tree.
    ariaHidden,
    alt,
    ...otherProps
  } = props

  return (
    <img
      aria-hidden={ariaHidden}
      sizes={sizes}
      srcSet={srcSet}
      src={src}
      alt={alt}
      {...otherProps}
      ref={ref}
      loading={loading}
      draggable={draggable}
      style={{
        position: `absolute`,
        top: 0,
        left: 0,
        width: `100%`,
        height: `100%`,
        objectFit: `cover`,
        objectPosition: `center`,
        ...style,
      }}
    />
  )
})

Img.propTypes = {
  style: PropTypes.object,
}

class Image extends React.Component {
  render() {
    const {
      title,
      alt,
      className,
      style = {},
      imgStyle = {},
      placeholderStyle = {},
      placeholderClassName,
      fluid,
      fixed,
      Tag,
      itemProp,
      loading,
      draggable,
    } = convertProps(this.props)

    const imageStyle = {
      ...imgStyle,
    }

    const imagePlaceholderStyle = {
      ...imgStyle,
      ...placeholderStyle,
    }

    const placeholderImageProps = {
      title,
      alt: ``,
      style: imagePlaceholderStyle,
      className: placeholderClassName,
      itemProp,
    }

    if (fluid) {
      const imageVariants = fluid
      const image = fluid[0]

      return (
        <Tag
          className={`${className ? className : ``} gatsby-image-wrapper`}
          style={{
            position: `relative`,
            overflow: `hidden`,
            ...style,
          }}
          key={`fluid-${JSON.stringify(image.srcSet)}`}
        >
          {/* Preserve the aspect ratio. */}
          <Tag
            aria-hidden
            style={{
              width: `100%`,
              paddingBottom: `${100 / image.aspectRatio}%`,
            }}
          />

          {/* Show the blurry base64 image. */}
          {image.base64 && (
            <Placeholder
              ariaHidden
              src={image.base64}
              spreadProps={placeholderImageProps}
              imageVariants={imageVariants}
              generateSources={generateBase64Sources}
            />
          )}

          {/* Show the traced SVG image. */}
          {image.tracedSVG && (
            <Placeholder
              ariaHidden
              src={image.tracedSVG}
              spreadProps={placeholderImageProps}
              imageVariants={imageVariants}
              generateSources={generateTracedSVGSources}
            />
          )}

          <picture>
            {generateImageSources(imageVariants)}
            <Img
              alt={alt}
              title={title}
              sizes={image.sizes}
              src={image.src}
              crossOrigin={this.props.crossOrigin}
              srcSet={image.srcSet}
              style={imageStyle}
              ref={this.imageRef}
              itemProp={itemProp}
              loading={loading}
              draggable={draggable}
            />
          </picture>
        </Tag>
      )
    }

    if (fixed) {
      const imageVariants = fixed
      const image = fixed[0]

      const divStyle = {
        position: `relative`,
        overflow: `hidden`,
        display: `inline-block`,
        width: image.width,
        height: image.height,
        ...style,
      }

      if (style.display === `inherit`) {
        delete divStyle.display
      }

      return (
        <Tag
          className={`${className ? className : ``} gatsby-image-wrapper`}
          style={divStyle}
          key={`fixed-${JSON.stringify(image.srcSet)}`}
        >
          {/* Show the blurry base64 image. */}
          {image.base64 && (
            <Placeholder
              ariaHidden
              src={image.base64}
              spreadProps={placeholderImageProps}
              imageVariants={imageVariants}
              generateSources={generateBase64Sources}
            />
          )}

          {/* Show the traced SVG image. */}
          {image.tracedSVG && (
            <Placeholder
              ariaHidden
              src={image.tracedSVG}
              spreadProps={placeholderImageProps}
              imageVariants={imageVariants}
              generateSources={generateTracedSVGSources}
            />
          )}

          <picture>
            {generateImageSources(imageVariants)}
            <Img
              alt={alt}
              title={title}
              width={image.width}
              height={image.height}
              sizes={image.sizes}
              src={image.src}
              crossOrigin={this.props.crossOrigin}
              srcSet={image.srcSet}
              style={imageStyle}
              itemProp={itemProp}
              loading={loading}
              draggable={draggable}
            />
          </picture>
        </Tag>
      )
    }

    return null
  }
}

Image.defaultProps = {
  fadeIn: true,
  alt: ``,
  Tag: `div`,
  // We set it to `lazy` by default because it's best to default to a performant
  // setting and let the user "opt out" to `eager`
  loading: `lazy`,
}

const fixedObject = PropTypes.shape({
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  src: PropTypes.string.isRequired,
  srcSet: PropTypes.string.isRequired,
  base64: PropTypes.string,
  tracedSVG: PropTypes.string,
  srcWebp: PropTypes.string,
  srcSetWebp: PropTypes.string,
  media: PropTypes.string,
})

const fluidObject = PropTypes.shape({
  aspectRatio: PropTypes.number.isRequired,
  src: PropTypes.string.isRequired,
  srcSet: PropTypes.string.isRequired,
  sizes: PropTypes.string.isRequired,
  base64: PropTypes.string,
  tracedSVG: PropTypes.string,
  srcWebp: PropTypes.string,
  srcSetWebp: PropTypes.string,
  media: PropTypes.string,
})

// If you modify these propTypes, please don't forget to update following files as well:
// https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-image/index.d.ts
// https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-image/README.md#gatsby-image-props
// https://github.com/gatsbyjs/gatsby/blob/master/docs/docs/gatsby-image.md#gatsby-image-props
Image.propTypes = {
  resolutions: fixedObject,
  sizes: fluidObject,
  fixed: PropTypes.oneOfType([fixedObject, PropTypes.arrayOf(fixedObject)]),
  fluid: PropTypes.oneOfType([fluidObject, PropTypes.arrayOf(fluidObject)]),
  fadeIn: PropTypes.bool,
  title: PropTypes.string,
  alt: PropTypes.string,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]), // Support Glamor's css prop.
  critical: PropTypes.bool,
  crossOrigin: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  style: PropTypes.object,
  imgStyle: PropTypes.object,
  placeholderStyle: PropTypes.object,
  placeholderClassName: PropTypes.string,
  Tag: PropTypes.string,
  itemProp: PropTypes.string,
  loading: PropTypes.oneOf([`auto`, `lazy`, `eager`]),
  draggable: PropTypes.bool,
}

export default Image
