// @flow
import * as React from 'react';
import compose from 'recompose/compose';
import {
  Route,
  Switch,
  Redirect,
  withRouter,
  type Location,
  type History,
} from 'react-router';
import { ThemeProvider } from 'styled-components';
import Loadable from 'react-loadable';
import { ErrorBoundary } from 'src/components/error';
import { CLIENT_URL } from './api/constants';
import generateMetaInfo from 'shared/generate-meta-info';
import GlobalStyles from './reset.css.js';
import { GlobalThreadAttachmentStyles } from 'src/components/message/threadAttachment/style';
import { theme } from 'shared/theme';
import AppViewWrapper from 'src/components/appViewWrapper';
import ScrollManager from 'src/components/scrollManager';
import Head from 'src/components/head';
import ModalRoot from 'src/components/modals/modalRoot';
import Gallery from 'src/components/gallery';
import Toasts from 'src/components/toasts';
import signedOutFallback from 'src/helpers/signed-out-fallback';
import ThreadSlider from 'src/views/threadSlider';
import AnnouncementBanner from 'src/components/announcementBanner';
import Navigation from 'src/views/navigation';
import Status from 'src/views/status';
import Login from 'src/views/login';
import DirectMessages from 'src/views/directMessages';
import { ThreadView } from 'src/views/thread';
import { withCurrentUser } from 'src/components/withCurrentUser';
import Maintenance from 'src/components/maintenance';
import type { GetUserType } from 'shared/graphql/queries/user/getUser';
import RedirectOldThreadRoute from './views/thread/redirect-old-route';
import NewUserOnboarding from './views/newUserOnboarding';
import QueryParamToastDispatcher from './views/queryParamToastDispatcher';
import { LoadingView } from 'src/views/viewHelpers';
import GlobalTitlebar from 'src/views/globalTitlebar';
import { NavigationContext } from 'src/helpers/navigation-context';

const Explore = Loadable({
  loader: () => import('./views/explore' /* webpackChunkName: "Explore" */),
  loading: ({ isLoading }) => isLoading && <LoadingView />,
});

/* prettier-ignore */
const UserView = Loadable({
  loader: () => import('./views/user'/* webpackChunkName: "UserView" */),
  loading: ({ isLoading }) => isLoading && <LoadingView />,
});

/* prettier-ignore */
const CommunityView = Loadable({
  loader: () => import('./views/community'/* webpackChunkName: "CommunityView" */),
  loading: ({ isLoading }) => isLoading && <LoadingView />,
});

/* prettier-ignore */
const ChannelView = Loadable({
  loader: () => import('./views/channel'/* webpackChunkName: "ChannelView" */),
  loading: ({ isLoading }) => isLoading && <LoadingView />,
});

/* prettier-ignore */
const UserSettings = Loadable({
  loader: () => import('./views/userSettings'/* webpackChunkName: "UserSettings" */),
  loading: ({ isLoading }) => isLoading && <LoadingView />,
});

/* prettier-ignore */
const CommunitySettings = Loadable({
  loader: () => import('./views/communitySettings'/* webpackChunkName: "communitySettings" */),
  loading: ({ isLoading }) => isLoading && <LoadingView />,
});

/* prettier-ignore */
const ChannelSettings = Loadable({
  loader: () => import('./views/channelSettings'/* webpackChunkName: "channelSettings" */),
  loading: ({ isLoading }) => isLoading && <LoadingView />,
});

/* prettier-ignore */
const Pages = Loadable({
  loader: () => import('./views/pages'/* webpackChunkName: "Splash" */),
  loading: ({ isLoading }) => isLoading && null,
});

/* prettier-ignore */
const ErrorFallback = Loadable({
  loader: () => import('./components/error'/* webpackChunkName: "Error" */),
  loading: ({ isLoading }) => isLoading && <LoadingView />
});

const LoginFallback = signedOutFallback(() => <Redirect to="/" />, Login);
const MessagesFallback = signedOutFallback(DirectMessages, () => (
  <Login redirectPath={`${CLIENT_URL}/messages`} />
));
const UserSettingsFallback = signedOutFallback(UserSettings, () => (
  <Login redirectPath={`${CLIENT_URL}/me/settings`} />
));
const CommunitySettingsFallback = signedOutFallback(CommunitySettings, () => (
  <Login />
));
const ChannelSettingsFallback = signedOutFallback(ChannelSettings, () => (
  <Login />
));

export const RouteModalContext = React.createContext({
  isModal: false,
});

type Props = {
  currentUser: ?GetUserType,
  isLoadingCurrentUser: boolean,
  maintenanceMode?: boolean,
  location: Location,
  history: History,
};

type State = {
  navigationIsOpen: boolean,
};

class Routes extends React.Component<Props, State> {
  previousLocation = this.props.location;
  state = { navigationIsOpen: false };

  setNavigationIsOpen = (val: boolean) =>
    this.setState({ navigationIsOpen: val });

  render() {
    const { currentUser, isLoadingCurrentUser } = this.props;
    const { navigationIsOpen } = this.state;
    const { title, description } = generateMetaInfo();

    if (this.props.maintenanceMode) {
      return (
        <ThemeProvider theme={theme}>
          <ScrollManager>
            <GlobalStyles />
            <Head
              title="Ongoing Maintenance - Spectrum"
              description="Spectrum is currently undergoing scheduled maintenance downtime. Please check https://twitter.com/withspectrum for ongoing updates."
            />
            <Maintenance />
          </ScrollManager>
        </ThemeProvider>
      );
    }

    const { location } = this.props;
    const isModal = false; /* !!(
      location.state &&
      location.state.modal &&
      this.previousLocation !== location
    ); // not initial render */

    // allows any UI in the tree to open or close the side navigation on mobile
    const navigationContext = {
      navigationIsOpen,
      setNavigationIsOpen: this.setNavigationIsOpen,
    };

    // allows any UI in the tree to know if it is existing within a modal or not
    // commonly used for background views to know that they are backgrounded
    const routeModalContext = { isModal };

    return (
      <ErrorBoundary fallbackComponent={ErrorFallback}>
        <ThemeProvider theme={theme}>
          <NavigationContext.Provider value={navigationContext}>
            {/* default meta tags, get overridden by anything further down the tree */}
            <Head title={title} description={description} />
            <GlobalStyles />
            <GlobalThreadAttachmentStyles />

            {/* dont let non-critical pieces of UI crash the whole app */}
            <ErrorBoundary>
              <Status />
            </ErrorBoundary>
            <ErrorBoundary>
              <Toasts />
            </ErrorBoundary>
            <ErrorBoundary>
              <Gallery />
            </ErrorBoundary>
            <ErrorBoundary>
              <ModalRoot />
            </ErrorBoundary>
            <ErrorBoundary>
              <QueryParamToastDispatcher />
            </ErrorBoundary>

            {isModal && (
              <Route
                // NOTE(@mxstbr): This custom path regexp matches threadId correctly in all cases, no matter if we prepend it with a custom slug or not.
                // Imagine our threadId is "id-123-id" (similar in shape to an actual UUID)
                // - /id-123-id => id-123-id, easy start that works
                // - /some-custom-slug~id-123-id => id-123-id, custom slug also works
                // - /~id-123-id => id-123-id => id-123-id, empty custom slug also works
                // - /some~custom~slug~id-123-id => id-123-id, custom slug with delimiter char in it (~) also works! :tada:
                path="/:communitySlug/:channelSlug/(.*~)?:threadId"
                component={props => (
                  <ThreadSlider
                    previousLocation={this.previousLocation}
                    {...props}
                  />
                )}
              />
            )}

            {/*
              this context provider allows children views to determine
              how they should behave if a modal is open. For example,
              you could tell a community view to not paginate the thread
              feed if a thread modal is open.
            */}
            <RouteModalContext.Provider value={routeModalContext}>
              {/*
                we tell the app view wrapper any time the modal state
                changes so that we can restore the scroll position to where
                it was before the modal was opened
              */}
              <AppViewWrapper {...routeModalContext}>
                <Route component={Navigation} />
                <Route component={GlobalTitlebar} />

                <div css={isModal ? { overflow: 'hidden' } : {}}>
                  <ErrorBoundary>
                    <AnnouncementBanner />
                  </ErrorBoundary>

                  {/*
                    switch only renders the first match. Subrouting happens downstream
                    https://reacttraining.com/react-router/web/api/Switch
                  */}
                  <Switch location={isModal ? this.previousLocation : location}>
                    <Route
                      exact
                      path="/"
                      render={() => <Redirect to="/explore" />}
                    />

                    {/* Public Business Pages */}
                    <Route
                      path="/home"
                      exact
                      render={() => <Redirect to="/explore" />}
                    />
                    <Route
                      path="/about"
                      exact
                      render={() => <Redirect to="/explore" />}
                    />
                    <Route
                      path="/contact"
                      exact
                      render={() => <Redirect to="/explore" />}
                    />
                    <Route
                      path="/support"
                      exact
                      render={() => <Redirect to="/explore" />}
                    />
                    <Route
                      path="/faq"
                      exact
                      render={() => <Redirect to="/explore" />}
                    />
                    <Route
                      path="/features"
                      exact
                      render={() => <Redirect to="/explore" />}
                    />
                    <Route
                      path="/new"
                      exact
                      render={() => <Redirect to="/explore" />}
                    />

                    <Route path="/terms" component={Pages} />
                    <Route path="/privacy" component={Pages} />
                    <Route path="/terms.html" component={Pages} />
                    <Route path="/privacy.html" component={Pages} />
                    <Route path="/code-of-conduct" component={Pages} />

                    {/* App Pages */}
                    <Route path="/login" component={LoginFallback} />
                    <Route path="/explore" component={Explore} />
                    <Route
                      path="/messages/:threadId"
                      component={MessagesFallback}
                    />
                    <Route path="/messages" component={MessagesFallback} />
                    <Route
                      path="/thread/:threadId"
                      component={RedirectOldThreadRoute}
                    />
                    <Route path="/thread" render={() => <Redirect to="/" />} />
                    <Route
                      exact
                      path="/users"
                      render={() => <Redirect to="/explore" />}
                    />
                    <Route exact path="/users/:username" component={UserView} />
                    <Route
                      exact
                      path="/users/:username/settings"
                      component={UserSettingsFallback}
                    />

                    <Route
                      path="/me/settings"
                      render={() =>
                        currentUser && currentUser.username ? (
                          <Redirect
                            to={`/users/${currentUser.username}/settings`}
                          />
                        ) : currentUser && !currentUser.username ? (
                          <NewUserOnboarding />
                        ) : isLoadingCurrentUser ? null : (
                          <Login redirectPath={`${CLIENT_URL}/me/settings`} />
                        )
                      }
                    />
                    <Route
                      path="/me"
                      render={() =>
                        currentUser && currentUser.username ? (
                          <Redirect to={`/users/${currentUser.username}`} />
                        ) : currentUser && !currentUser.username ? (
                          <NewUserOnboarding />
                        ) : isLoadingCurrentUser ? null : (
                          <Login redirectPath={`${CLIENT_URL}/me`} />
                        )
                      }
                    />

                    {/*
                        We check communitySlug last to ensure none of the above routes
                        pass. We handle null communitySlug values downstream by either
                        redirecting to home or showing a 404
                      */}
                    <Route
                      path="/:communitySlug/:channelSlug/settings"
                      component={ChannelSettingsFallback}
                    />
                    <Route
                      path="/:communitySlug/settings"
                      component={CommunitySettingsFallback}
                    />
                    <Route
                      path="/:communitySlug/login"
                      render={() => <Redirect to="/explore" />}
                    />
                    <Route
                      // NOTE(@mxstbr): This custom path regexp matches threadId correctly in all cases, no matter if we prepend it with a custom slug or not.
                      // Imagine our threadId is "id-123-id" (similar in shape to an actual UUID)
                      // - /id-123-id => id-123-id, easy start that works
                      // - /some-custom-slug~id-123-id => id-123-id, custom slug also works
                      // - /~id-123-id => id-123-id => id-123-id, empty custom slug also works
                      // - /some~custom~slug~id-123-id => id-123-id, custom slug with delimiter char in it (~) also works! :tada:
                      path="/:communitySlug/:channelSlug/(.*~)?:threadId"
                      component={ThreadView}
                    />
                    <Route
                      path="/:communitySlug/:channelSlug"
                      component={ChannelView}
                    />
                    <Route path="/:communitySlug" component={CommunityView} />
                  </Switch>
                </div>

                {isModal && (
                  <Route
                    path="/thread/:threadId"
                    component={RedirectOldThreadRoute}
                  />
                )}
              </AppViewWrapper>
            </RouteModalContext.Provider>
          </NavigationContext.Provider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }
}

export default compose(
  withCurrentUser,
  withRouter
)(Routes);
