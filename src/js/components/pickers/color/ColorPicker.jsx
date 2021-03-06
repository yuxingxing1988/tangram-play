// Class essentially taken from 'react-color': https://github.com/casesandberg/react-color/blob/master/src/components/sketched/Sketch.js
import React from 'react';
import { Hue, Alpha, Checkboard } from 'react-color/lib/components/common';
import ColorPickerSaturation from './ColorPickerSaturation';
import ColorPickerInputFields from './ColorPickerInputFields';
import Color from './color';

export default class ColorPicker extends React.Component {
  constructor(props) {
    super(props);

    // tinycolor2 resets hue to zero when either saturation (s) or
    // brightness (v) is zero, so we maintain our own internal cache
    // of this. We also remember the alpha because sometimes it is
    // also reset. (TODO)
    const color = this.props.color.getHsv();
    this.state = {
      hue: color.h,
      alpha: color.a,
    };

    this.onChangeSaturation = this.onChangeSaturation.bind(this);
    this.onChangeHueAlpha = this.onChangeHueAlpha.bind(this);
    this.onChangeInputs = this.onChangeInputs.bind(this);
  }

  onChangeSaturation(data) {
    // Use cached hue and alpha value
    const color = new Color({
      h: this.state.hue,
      s: data.s,
      v: data.v,
      a: this.state.alpha,
    });
    this.props.onChange(color);
  }

  onChangeHueAlpha(data) {
    const color = new Color({ h: data.h, s: data.s, l: data.l, a: data.a });
    this.props.onChange(color);
    this.setState({ hue: data.h, alpha: data.a });
  }

  onChangeInputs(data) {
    // If data comes as RGBA object
    if ({}.hasOwnProperty.call(data, 'r')) {
      const color = new Color({ r: data.r, g: data.g, b: data.b, a: data.a });
      this.props.onChange(color);
      this.setState({ hue: color.toHsv().h, alpha: data.a });
    } else {
      // Else if its a hex string
      const color = new Color(data);
      this.props.onChange(color);
    }
  }

  render() {
    const hsl = this.props.color.getHsl();
    const hueHslProp = {
      h: this.state.hue,
      s: hsl.s,
      l: hsl.l,
      a: hsl.a,
    };

    return (
      <div className="colorpicker-container">
        <ColorPickerSaturation
          hue={this.state.hue}
          color={this.props.color}
          onChange={this.onChangeSaturation}
        />

        <div className="colorpicker-controls">
          <div className="colorpicker-sliders">
            <div className="colorpicker-slider-hue">
              <Hue
                hsl={hueHslProp}
                onChange={this.onChangeHueAlpha}
              />
            </div>
            <div className="colorpicker-slider-alpha">
              <Alpha
                rgb={this.props.color.getRgba()}
                hsl={hueHslProp}
                onChange={this.onChangeHueAlpha}
              />
            </div>
          </div>
          <div className="colorpicker-active-color">
            <Checkboard size="6" />
            <div
              className="colorpicker-active-color-swatch"
              style={{ backgroundColor: this.props.color.getRgbaString() }}
            />
          </div>
        </div>

        <ColorPickerInputFields
          {...this.props}
          onChange={this.onChangeInputs}
        />
      </div>
    );
  }
}

ColorPicker.propTypes = {
  color: React.PropTypes.objectOf(React.PropTypes.any),
  onChange: React.PropTypes.func,
};
