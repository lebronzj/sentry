import React from 'react';

import CrashContent from 'app/components/events/interfaces/crashContent';
import {withMeta} from 'app/components/events/meta/metaProxy';
import {mountWithTheme} from 'sentry-test/enzyme';

describe('CrashContent', function () {
  const exc = TestStubs.ExceptionWithMeta({platform: 'cocoa'});
  const event = TestStubs.Event();

  const proxiedExc = withMeta(exc);

  it('renders with meta data', function () {
    const wrapper = mountWithTheme(
      <CrashContent
        projectId="sentry"
        stackView="full"
        stackType="original"
        event={event}
        newestFirst
        exception={proxiedExc.exception}
      />
    );

    expect(wrapper).toSnapshot();
  });
});
