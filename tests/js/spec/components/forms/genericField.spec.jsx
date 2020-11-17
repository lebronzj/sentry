import React from 'react';

import {FormState, GenericField} from 'app/components/forms';
import {mountWithTheme} from 'sentry-test/enzyme';

describe('GenericField', function () {
  it('renders text as TextInput', function () {
    const wrapper = mountWithTheme(
      <GenericField
        formState={FormState.READY}
        config={{
          name: 'field-name',
          label: 'field label',
          type: 'text',
        }}
      />
    );
    expect(wrapper.find('TextField')).toHaveLength(1);
  });

  it('renders text with choices as SelectCreatableField', function () {
    const wrapper = mountWithTheme(
      <GenericField
        formState={FormState.READY}
        config={{
          name: 'field-name',
          label: 'field label',
          type: 'text',
          choices: [],
        }}
      />
    );
    expect(wrapper.find('SelectCreatableField')).toHaveLength(1);
  });
});
