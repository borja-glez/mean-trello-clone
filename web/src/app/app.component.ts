import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'web';

  token?: string;
  private subs = new Subscription();

  constructor(private apollo: Apollo, private httpClient: HttpClient) {}

  ngOnInit() {
    this.subs.add(
      this.apollo
        .mutate<any>({
          mutation: gql`
            mutation AuthenticateMutation(
              $authenticateInput: AuthenticateInput
            ) {
              authenticate(input: $authenticateInput) {
                access_token
              }
            }
          `,
          variables: {
            authenticateInput: {
              email: 'borja@borjaglez.com',
              password: 'test12345',
            },
          },
        })
        .subscribe(({ data }) => {
          this.token = data.authenticate.access_token;
          console.log(this.token);
        })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  getAuthenticatedUser() {
    this.subs.add(
      this.apollo
        .query<any>({
          query: gql`
            query Query {
              getAuthenticatedUser {
                name
                email
                avatar
                boards {
                  title
                  backgroundURL
                  members {
                    name
                    role
                  }
                  lists {
                    title
                    archived
                    cards {
                      title
                      description
                      tags
                      archived
                      checklist {
                        text
                        complete
                      }
                      members {
                        name
                        role
                      }
                    }
                  }
                  activity {
                    text
                    date
                  }
                }
              }
            }
          `,
          context: {
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
          },
        })
        .subscribe(({ data }) => {
          console.log(data);
        })
    );
  }
}
